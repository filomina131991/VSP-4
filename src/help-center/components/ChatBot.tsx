import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, HelpCircle, X, Send, Bot, User, Sparkles, ThumbsUp, ThumbsDown, KeyRound, Mail, CheckCircle2, ExternalLink, AlertTriangle, Search } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { apiClient } from '../../lib/apiClient';
import { processQuery } from '../lib/chatbotEngine';
import { isGeminiEnabled, queryGemini } from '../lib/geminiService';
import { trackErrorView } from '../lib/analyticsTracker';
import { ChatMessage } from '../types';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

type ChatMode = 'help' | 'chat';

export const ChatBot: React.FC = () => {
  const { errors } = useHelpCenter();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('help');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! Ask me any question about Vijayasree portal. I will show you step-by-step instructions.',
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
        { label: 'Open Help Center →', link: '/help' },
        { label: 'How to add student?', action: 'add_student' },
        { label: 'Medium Issue', action: 'medium_issue' },
        { label: 'Language Error', action: 'language_validation' },
        { label: 'Forgot Password', action: 'forgot_password' },
        { label: 'Login Issue', action: 'login_issue' }
      ]
    }
  ]);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | null>>({});
  const [forgotState, setForgotState] = useState<'idle' | 'awaiting_email' | 'sending' | 'done'>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) { setSuggestions([]); setShowSuggestions(false); return; }
    if (!inputText.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    if (forgotState === 'awaiting_email') { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/help/suggestions?q=${encodeURIComponent(inputText.trim())}`);
        setSuggestions(res.data || []);
        setShowSuggestions(res.data?.length > 0);
      } catch { setSuggestions([]); setShowSuggestions(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [inputText, isOpen, forgotState]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleFeedback = async (msgId: string, type: 'up' | 'down', matchedQnA?: any, matchedError?: any) => {
    if (feedbackState[msgId]) return;
    setFeedbackState(prev => ({ ...prev, [msgId]: type }));

    const matchedTitle = matchedQnA?.question || matchedError?.title || '';
    const matchedId = matchedQnA?.id || matchedError?.id || '';
    const matchType = matchedQnA ? 'qna' : matchedError ? 'error' : undefined;

    apiClient.post('/help/feedback', {
      type,
      query: messages.find(m => m.sender === 'user')?.text || '',
      matchedTitle,
      matchedId,
      matchType,
    }).catch(() => {});

    if (type === 'down') {
      try {
        await apiClient.post('/alerts', {
          title: `Chat Feedback: Not Useful`,
          content: `User (${user?.username || 'unknown'}) found "${matchedTitle || 'unknown query'}" not useful.`,
          target: 'ALL',
          createdBy: user?.id
        });
      } catch { }
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim()) return;
    setMode('chat');

    if (forgotState === 'awaiting_email') {
      handleSendForgotEmail(q.trim());
      if (!textToSend) setInputText('');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setShowSuggestions(false);

    // Try backend article search first
    try {
      const res = await apiClient.post('/help/articles/search', { q: q.trim() });
      const articles = res.data;
      if (articles?.length > 0) {
        const article = articles[0];
        trackErrorView({
          schoolCode: user?.schoolCode, schoolName: user?.displayName,
          errorName: article.title, errorId: article._id, userQuery: q,
          user: user?.username, category: article.category, matchType: 'qna'
        }).catch(() => {});
        const botMsg: ChatMessage = {
          id: `article-${Date.now()}`,
          sender: 'bot',
          text: `**${article.title}**\n\n${article.problem || ''}`,
          steps: article.solutionSteps || [],
          matchedQnA: { id: article._id, question: article.title, answer: '', keywords: article.keywords || [], intent: '', category: article.category, steps: article.solutionSteps || [], lastUpdated: '' },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            ...(articles.slice(1, 4).map((a: any) => ({ label: a.title, action: 'view_article', link: '' }) as any)),
            { label: 'Was this helpful? 👍', action: 'article_helpful' },
            { label: 'No, still stuck 👎', action: 'article_not_helpful' }
          ]
        };
        setMessages(prev => [...prev, botMsg]);
        apiClient.post('/help/search-log', { searchText: q.trim(), matchedArticleId: article._id, matched: true }).catch(() => {});
        return;
      }
    } catch {}

    // Fallback to local engine
    const localResponse = processQuery(q, errors);

    if (localResponse.matchedQnA || localResponse.matchedError) {
      const matched = localResponse.matchedQnA || localResponse.matchedError;
      if (matched) {
        trackErrorView({
          schoolCode: user?.schoolCode,
          schoolName: user?.displayName,
          errorName: 'question' in matched ? matched.question : matched.title,
          errorId: matched.id,
          userQuery: q,
          user: user?.username,
          category: 'category' in matched ? matched.category : 'GENERAL',
          matchType: 'question' in matched ? 'qna' : 'error'
        });
      }
      setMessages(prev => [...prev, localResponse]);
      return;
    }

    // Not found in backend or local - show "not found" message and log
    apiClient.post('/help/search-log', { searchText: q.trim(), matched: false }).catch(() => {});

    if (isGeminiEnabled() && localResponse.suggestions?.length === 5) {
      setMessages(prev => [...prev, {
        id: `thinking-${Date.now()}`,
        sender: 'bot',
        text: 'Searching Gemini AI...',
        steps: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      const geminiResponse = await queryGemini(q, [
        'How to add students?', 'How to delete student?', 'How to add teacher?',
        'Medium Validation Error', 'Language Validation Error', 'Login Issues',
        'Marks Entry Not Working', 'Exam Configuration Missing'
      ]);
      setMessages(prev => prev.filter(m => m.id !== `thinking-${Date.now()}`));
      if (!geminiResponse.matchedQnA && !geminiResponse.matchedError) {
        setMessages(prev => [...prev, {
          id: `notfound-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ **Help Article Not Found**\n\nWe couldn't find a solution for "${q.trim()}".\n\nThis issue has been recorded. Please contact your District Administrator. The Help Center team will add this solution in a future update.`,
          steps: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [{ label: 'Contact Admin →', link: '/help/tickets' }]
        }]);
      } else {
        setMessages(prev => [...prev, geminiResponse]);
      }
    } else {
      setMessages(prev => [...prev, {
        id: `notfound-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ **Help Article Not Found**\n\nWe couldn't find a solution for "${q.trim()}".\n\nThis issue has been recorded. Please contact your District Administrator. The Help Center team will add this solution in a future update.`,
        steps: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [{ label: 'Contact Admin →', link: '/help/tickets' }]
      }]);
    }
  };

  const handleForgotPassword = () => {
    setMode('chat');
    setForgotState('awaiting_email');
    setForgotEmail('');
    const botMsg: ChatMessage = {
      id: `forgot-ask-${Date.now()}`,
      sender: 'bot',
      text: `I can help you reset your password. Please enter your registered school email address below and I will send a password reset link to your inbox.`,
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botMsg]);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSendForgotEmail = async (email: string) => {
    setForgotState('sending');
    const userMsg: ChatMessage = {
      id: `user-email-${Date.now()}`,
      sender: 'user',
      text: email,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      const data = res.data;
      setForgotState('done');
      const successMsg: ChatMessage = {
        id: `forgot-success-${Date.now()}`,
        sender: 'bot',
        text: `✅ Password reset link has been sent successfully to **${email}**!\n\nFollow these steps to complete your password reset:`,
        steps: [
          'Check your email inbox (also check the Spam / Junk folder)',
          'Open the email from "Vijayasree Palakkad" with subject "Password Reset Request"',
          'Click the "Reset Password" button in the email',
          'Enter your new password and confirm it',
          'Click "Reset Password" to save changes',
          'Return to the Login page and sign in with your new password'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          { label: 'Back to Login →', link: '/login' }
        ]
      };
      setMessages(prev => [...prev, successMsg]);
    } catch (err: any) {
      setForgotState('idle');
      const errorMsg = err.response?.data?.error || 'Failed to send reset link. Please try again later.';
      const failMsg: ChatMessage = {
        id: `forgot-fail-${Date.now()}`,
        sender: 'bot',
        text: `❌ **Unable to send reset link.**\n\n${errorMsg}\n\nPlease check that you entered the correct school email address or contact your administrator for help.`,
        steps: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          { label: 'Try Again', action: 'forgot_password' },
          { label: 'Login Page', link: '/login' }
        ]
      };
      setMessages(prev => [...prev, failMsg]);
    }
  };

  const handleArticleFeedback = async (msg: ChatMessage, helpful: boolean) => {
    if (feedbackState[msg.id]) return;
    setFeedbackState(prev => ({ ...prev, [msg.id]: helpful ? 'up' : 'down' }));
    if (msg.matchedQnA?.id) {
      apiClient.post(`/help/articles/${msg.matchedQnA.id}/feedback`, { helpful }).catch(() => {});
    }
    if (!helpful) {
      setMessages(prev => [...prev, {
        id: `feedback-wrong-${Date.now()}`,
        sender: 'bot',
        text: 'What went wrong? Select an option:',
        steps: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          { label: 'Problem not solved', action: 'feedback_problem_unsolved' },
          { label: 'Steps confusing', action: 'feedback_steps_confusing' },
          { label: 'Need Screenshot', action: 'feedback_need_screenshot' },
          { label: 'Need Video', action: 'feedback_need_video' },
          { label: 'Other', action: 'feedback_other' }
        ]
      }]);
    }
  };

  const handleSuggestionClick = (suggestion: { label: string; link?: string; action?: string }, msg?: ChatMessage) => {
    if (suggestion.link) {
      navigate(suggestion.link);
      setIsOpen(false);
    } else if (suggestion.action === 'feedback_yes') {
      setShowFeedback('thank you');
      setTimeout(() => setShowFeedback(null), 2000);
    } else if (suggestion.action === 'open_help_center') {
      navigate('/help');
      setIsOpen(false);
    } else if (suggestion.action === 'local_search') {
      handleSend('How to add student?');
    } else if (suggestion.action === 'forgot_password') {
      handleForgotPassword();
    } else if (suggestion.action === 'article_helpful') {
      const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot' && m.matchedQnA);
      if (lastBotMsg) handleArticleFeedback(lastBotMsg, true);
    } else if (suggestion.action === 'article_not_helpful') {
      const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot' && m.matchedQnA);
      if (lastBotMsg) handleArticleFeedback(lastBotMsg, false);
    } else if (suggestion.action === 'view_article') {
      handleSend(suggestion.label);
    } else {
      const qnaActions: Record<string, string> = {
        add_student: 'How to add student?',
        delete_student: 'How to delete student?',
        add_teacher: 'How to add teacher?',
        medium_issue: 'Medium Validation Error',
        language_validation: 'Language Validation Error',
        subject_missing: 'Teacher Subject Missing',
        marks_entry: 'Marks Entry Not Working',
        exam_config: 'Exam Configuration Missing',
        teacher_profile: 'Teacher Profile Incomplete',
        final_confirmation: 'Final Confirmation Disabled',
        dashboard_count: 'Dashboard Count Wrong',
        ict_option: 'ICT Option Missing',
        login_issue: 'Login Issues',
        sync_error: 'Sync Error',
        password_reset: 'How to Reset Password?',
        teacher_password_reset: 'Teacher Password Reset by School Admin',
        generate_report: 'How to Generate Report?',
        upload_result: 'How to Upload Results?',
        paper1_missing: 'Paper I Missing',
        paper2_missing: 'Paper II Missing',
        student_count_mismatch: 'Student Count Mismatch',
        teacher_pending_confirmation: 'Pending Subject Confirmation',
        language_distribution: 'Language Distribution Mismatch',
        edit_student: 'How to edit student details?'
      };
      if (suggestion.action && qnaActions[suggestion.action]) {
        handleSend(qnaActions[suggestion.action]);
      }
    }
  };

  const quickHelpButtons = [
    { label: 'Go to Help Center', icon: '🏠', action: 'open_help_center' },
    { label: 'Add Student', icon: '👤', action: 'add_student' },
    { label: 'Add Teacher', icon: '👨‍🏫', action: 'add_teacher' },
    { label: 'Forgot Password', icon: '🔑', action: 'forgot_password' },
    { label: 'Medium Issue', icon: '📚', action: 'medium_issue' },
    { label: 'Language Error', icon: '🔤', action: 'language_validation' },
    { label: 'Marks Entry', icon: '📝', action: 'marks_entry' },
    { label: 'Exam Config', icon: '📋', action: 'exam_config' },
    { label: 'Login Issue', icon: '🔐', action: 'login_issue' },
    { label: 'Sync Error', icon: '🔄', action: 'sync_error' },
    { label: 'Reset Teacher Pass', icon: '🔄', action: 'teacher_password_reset' },
    { label: 'Generate Report', icon: '📊', action: 'generate_report' },
    { label: 'Student Count Issue', icon: '🔢', action: 'student_count_mismatch' },
    { label: 'Upload Results', icon: '📤', action: 'upload_result' },
    { label: 'Edit Student', icon: '✏️', action: 'edit_student' }
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpen && (
          <div className="w-[92vw] sm:w-[400px] bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5 duration-200">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center">
                  {mode === 'help' ? <HelpCircle className="w-5 h-5" /> : <Bot className="w-5 h-5 text-amber-300" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{mode === 'help' ? 'Help & Support' : 'Chat Assistant'}</h3>
                  <span className="text-[10px] text-blue-100">{mode === 'help' ? 'Quick Help & Help Center' : 'Ask me anything'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode(mode === 'help' ? 'chat' : 'help')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                    mode === 'help' ? 'bg-white/20 text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20'
                  }`}
                  title={`Switch to ${mode === 'help' ? 'Chat' : 'Help'} mode`}
                >
                  {mode === 'help' ? 'Chat Mode' : 'Help Mode'}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {mode === 'help' ? (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={forgotState === 'awaiting_email' ? 'Enter your school email...' : 'Search error or question...'}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setShowSuggestions(false); handleSend(); }
                      if (e.key === 'ArrowDown' && suggestions.length > 0) e.preventDefault();
                    }}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {showSuggestions && (
                    <div ref={suggestRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => { setInputText(s); setShowSuggestions(false); handleSend(s); }}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                          <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-800 dark:text-gray-200">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">
                  Quick Help
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {quickHelpButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => { handleSend(btn.label); setMode('chat'); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left active-tap"
                    >
                      <span className="text-base">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>

              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender !== 'user' && (
                        <div className="w-6 h-6 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                          {msg.sender === 'gemini' ? <Sparkles className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                      )}
                      <div className={`max-w-[88%] rounded-2xl p-3 ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-none'
                      }`}>
                        <p className="text-xs whitespace-pre-line leading-relaxed">{msg.text}</p>

                        {msg.steps && msg.steps.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                              Steps
                            </div>
                            <ol className="space-y-1">
                              {msg.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300 leading-tight">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.suggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => handleSuggestionClick(s)}
                                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
                              >
                                {s.link ? (
                                  <span>{s.label} →</span>
                                ) : (
                                  s.label
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {msg.sender !== 'user' && !feedbackState[msg.id] && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-medium">Useful?</span>
                            <button
                              onClick={() => handleFeedback(msg.id, 'up', msg.matchedQnA, msg.matchedError)}
                              className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            >
                              <ThumbsUp size={12} className="text-gray-400 hover:text-emerald-500" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down', msg.matchedQnA, msg.matchedError)}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <ThumbsDown size={12} className="text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        )}
                        {feedbackState[msg.id] === 'up' && (
                          <div className="mt-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Thanks!</div>
                        )}
                        {feedbackState[msg.id] === 'down' && (
                          <div className="mt-1 text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Noted. Admin notified.</div>
                        )}

                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="relative">
                  {showSuggestions && suggestions.length > 0 && (
                    <div ref={suggestRef} className="absolute bottom-full mb-1 left-2 right-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
                      <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-700/50 text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                        <span>Suggested Articles / Topics</span>
                        <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400">{suggestions.length} matches</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setInputText(sug);
                              setShowSuggestions(false);
                              handleSend(sug);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex items-center gap-2"
                          >
                            <Search size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate">{sug}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-2.5 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={forgotState === 'awaiting_email' ? 'Enter your school email...' : 'Type your question...'}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all font-bold text-sm active-tap"
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
          <span>{isOpen ? 'Close' : mode === 'help' ? 'Help' : 'Chat'}</span>
        </button>
      </div>
    </>
  );
};
