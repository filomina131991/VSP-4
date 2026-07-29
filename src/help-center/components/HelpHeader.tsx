import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  Bookmark, 
  HelpCircle, 
  BookOpen, 
  CheckCircle, 
  Compass, 
  AlertTriangle, 
  MessageSquare, 
  Layers, 
  Info,
  Download,
  Menu,
  X,
  Sparkles,
  LogIn,
  LayoutDashboard
} from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';
import { useAuth } from '../../context/AuthContext';

export const HelpHeader: React.FC = () => {
  const { theme, toggleTheme, isOnline, bookmarks, setZoomedImage } = useHelpCenter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('PWA Offline mode is already enabled! You can add this page to your home screen via browser menu.');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/help', icon: Compass },
    { label: '16-Step Guide', path: '/help/guide', icon: CheckCircle },
    { label: '100+ Error Library', path: '/help/errors', icon: AlertTriangle },
    { label: 'Knowledge Base', path: '/help/kb', icon: BookOpen },
    { label: 'FAQs', path: '/help/faq', icon: HelpCircle },
    { label: 'Wizard', path: '/help/wizard', icon: Layers },
    { label: 'Workflow', path: '/help/workflow', icon: Compass },
    { label: 'Support Ticket', path: '/help/tickets', icon: MessageSquare },
    { label: 'About', path: '/help/about', icon: Info },
    ...(user ? [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] : [{ label: 'Back to Login', path: '/login', icon: LogIn }])
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-gray-200 dark:border-slate-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/help" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-lg bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent block leading-none">
                  Vijayasree Help Center
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                  Palakkad SSLC Help System (PWA)
                </span>
              </div>
            </Link>

            {/* Offline/Online Status Badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
              <span>{isOnline ? 'Online' : 'Offline PWA Active'}</span>
            </div>
          </div>

          {/* Quick Offline Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search 100+ errors, guides, FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-gray-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Back to Login / Go to Dashboard Button */}
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-xl transition-all shadow-sm border border-blue-200 dark:border-blue-800"
                title="Go to Analysis Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                title="Return to Vijayasree Login Page"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Back to Login</span>
              </Link>
            )}
            
            {/* Install PWA Button */}
            <button
              onClick={handleInstallPwa}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              title="Install App for 100% Offline Access"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA</span>
            </button>

            {/* Bookmarks Counter */}
            <Link
              to="/help/bookmarks"
              className="relative p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Saved Help Items"
            >
              <Bookmark className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {bookmarks.length}
                </span>
              )}
            </Link>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Light / Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links Bar */}
        <nav className="hidden lg:flex items-center gap-1 py-2 border-t border-gray-100 dark:border-slate-800/80 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search errors & guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
