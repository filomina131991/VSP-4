import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight, CornerDownLeft, RefreshCw } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { processAiUserQuery, AiChatMessage } from '../lib/aiEngine';
import { Link } from 'react-router-dom';

export const AiAssistantModal: React.FC = () => {
  const { errors } = useHelpCenter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello! 👋 I am your offline **Vijayasree AI Assistant**.
      
I can search our offline database of 100+ error codes, guides, and FAQs instantly.

Try asking me about:
• Language Validation Error
• Teacher Subject Missing
• Medium Not Showing
• Final Confirmation Hidden
• Dashboard Wrong Count`,
      malayalamText: `നമസ്കാരം! നിങ്ങളുടെ സംശയങ്ങളും എററുകളും ഇവിടെ ചോദിക്കാവുന്നതാണ്.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim()) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Process query locally using aiEngine
    setTimeout(() => {
      const responseMsg = processAiUserQuery(q, errors);
      setMessages(prev => [...prev, responseMsg]);
    }, 200);
  };

  const samplePrompts = [
    "Language Validation Error",
    "Teacher Subject Missing",
    "Medium Not Showing",
    "Final Confirmation Hidden",
    "Dashboard Wrong Count"
  ];

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all font-semibold text-sm group"
        title="Open Offline AI Assistant"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
        <span className="hidden sm:inline">AI Troubleshooting</span>
        <span className="sm:hidden">AI Assistant</span>
      </button>

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 max-w-md w-full sm:w-[420px] bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[560px] animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Vijayasree AI Assistant</h3>
                <span className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  100% Offline Database Ready
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Chip Bar */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 overflow-x-auto flex gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-600 rounded-full hover:bg-blue-50 dark:hover:bg-slate-600 whitespace-nowrap transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Message History List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {msg.malayalamText && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      <p className="whitespace-pre-line">{msg.malayalamText}</p>
                    </div>
                  )}

                  {msg.suggestedAction && (
                    <div className="mt-3">
                      <Link
                        to={msg.suggestedAction.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 rounded-xl font-semibold hover:bg-blue-100 transition-colors text-[11px]"
                      >
                        <span>{msg.suggestedAction.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}

                  <span className="block mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 text-right">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask AI Assistant about any error or guide..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 pl-3.5 pr-2 py-2 text-xs rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
      )}
    </>
  );
};
