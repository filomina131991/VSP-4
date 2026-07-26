import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const DietPalakkadLogo = () => (
  <div className="flex flex-col items-center justify-center">
    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30">
      <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V8.25M12 21a9.003 9.003 0 008.316-5.56zM12 21a9.003 9.003 0 01-8.316-5.56zM12 8.25a8.967 8.967 0 016-2.292c1.052 0 2.062.18 3 .512v11.056c-.954-.333-1.968-.514-3-.514a8.967 8.967 0 00-6 2.292m0-11.458a8.967 8.967 0 00-6-2.292c-1.052 0-2.062.18-3 .512v11.056c.954-.333 1.968-.514 3-.514a8.967 8.967 0 016 2.292m0-11.458V4.5" />
      </svg>
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
      </span>
    </div>
    <div className="mt-3 text-center">
      <h2 className="text-xl font-bold tracking-tight text-[#1e293b] dark:text-white sm:text-2xl font-sans">
        DIET <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Palakkad</span>
      </h2>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
        District Institute of Education & Training
      </p>
      <p className="text-[9px] font-semibold text-blue-500 dark:text-blue-400">
        Palakkad District, Government of Kerala
      </p>
    </div>
  </div>
);

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      
      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(response.data.message || 'Password reset link sent to your email');
      if (response.data.resetUrl) {
        setDevResetUrl(response.data.resetUrl);
      } else {
        setDevResetUrl('');
      }
      setSubmitted(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to send reset link';
      const details = error.response?.data?.details;
      toast.error(details ? `${errorMsg}: ${details}` : errorMsg);
      if (error.response?.data?.devInfo?.resetUrl) {
        setDevResetUrl(error.response.data.devInfo.resetUrl);
        toast.success(error.response.data.devInfo.message);
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      {/* Background glow effects */}
      <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-500/5" />
      <div className="absolute -bottom-[40%] -right-[20%] h-[80%] w-[80%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/5" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl border p-8 sm:p-10 shadow-2xl transition-all duration-300 backdrop-blur-md",
          isDark 
            ? "border-slate-800 bg-slate-900/80 text-white shadow-blue-950/20" 
            : "border-slate-200/80 bg-white/95 text-slate-800 shadow-slate-200/50"
        )}>
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

          {/* Logo Section */}
          <div className="mb-8">
            <DietPalakkadLogo />
          </div>

          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Check Your Email</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  We have generated a password reset link for <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>.
                </p>
              </div>

              {devResetUrl && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 text-left dark:border-amber-900/30 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 mb-2">
                    <ShieldAlert size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">DIET Admin Local Bypass</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-normal">
                    Since the server is using placeholder credentials, click the button below to reset your password directly:
                  </p>
                  <a 
                    href={devResetUrl} 
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    Bypass & Reset Password
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 uppercase tracking-wider"
                >
                  Try Another Email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block pl-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.com"
                    className={cn(
                      "block w-full rounded-2xl border px-11 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      isDark 
                        ? "border-slate-800 bg-slate-950/60 text-white placeholder:text-slate-600 focus:border-blue-500" 
                        : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                    )}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-1 leading-normal">
                  Enter the email associated with your School, Coordinator, or DIET Account.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-slate-900 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="mr-3 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer / Copyright Section */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            DIET Palakkad © {new Date().getFullYear()}
          </p>
          <p className="text-[9px] text-slate-400/80 dark:text-slate-600 mt-1">
            All Rights Reserved. Managed by DIET Palakkad Admin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
