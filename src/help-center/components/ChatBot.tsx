import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, HelpCircle, X, Send, Bot, User, Sparkles, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
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
        { label: 'How to add student?', action: 'add_student' },
        { label: 'Medium Issue', action: 'medium_issue' },
        { label: 'Language Error', action: 'language_validation' },
        { label: 'Login Issue', action: 'login_issue' }
      ]
    }
  ]);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

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
          category: 'category' in matched ? matched.category : 'GENERAL'
        });
      }
      setMessages(prev => [...prev, localResponse]);
      return;
    }

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
      setMessages(prev => [...prev, geminiResponse]);
    } else {
      setMessages(prev => [...prev, localResponse]);
    }
  };

  const handleSuggestionClick = (suggestion: { label: string; link?: string; action?: string }) => {
    if (suggestion.link) {
      navigate(suggestion.link);
      setIsOpen(false);
    } else if (suggestion.action === 'feedback_yes') {
      setShowFeedback('thank you');
      setTimeout(() => setShowFeedback(null), 2000);
    } else if (suggestion.action === 'local_search') {
      handleSend('How to add student?');
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
    { label: 'Add Student', icon: '👤', action: 'add_student' },
    { label: 'Delete Student', icon: '🗑️', action: 'delete_student' },
    { label: 'Add Teacher', icon: '👨‍🏫', action: 'add_teacher' },
    { label: 'Medium Issue', icon: '📚', action: 'medium_issue' },
    { label: 'Language Error', icon: '🔤', action: 'language_validation' },
    { label: 'Marks Entry', icon: '📝', action: 'marks_entry' },
    { label: 'Exam Config', icon: '📋', action: 'exam_config' },
    { label: 'Login Issue', icon: '🔑', action: 'login_issue' },
    { label: 'Sync Error', icon: '🔄', action: 'sync_error' },
    { label: 'Profile', icon: '👤', action: 'teacher_profile' }
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
                  <h3 className="font-bold text-sm">{mode === 'help' ? 'Help Center' : 'Chat Assistant'}</h3>
                  <span className="text-[10px] text-blue-100">{mode === 'help' ? 'Quick Help Buttons' : 'Ask me anything'}</span>
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
                <div className="mb-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search error or question..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
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

                        {msg.matchedError && (
                          <div className="mt-2">
                            <Link
                              to={`/help/errors/${msg.matchedError.id}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Open Full Guide →
                            </Link>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500">{msg.timestamp}</span>
                          {msg.sender !== 'user' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setShowFeedback('up')}
                                className={`p-0.5 rounded ${showFeedback === 'up' ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setShowFeedback('down')}
                                className={`p-0.5 rounded ${showFeedback === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {showFeedback === 'up' && (
                    <div className="text-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Thanks for your feedback!
                    </div>
                  )}
                  {showFeedback === 'down' && (
                    <div className="text-center">
                      <Link
                        to="/help/tickets"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Create a support ticket for further help →
                      </Link>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-2.5 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your question..."
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
