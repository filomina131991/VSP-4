import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  User,
  HelpCircle,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import FloatingHelpButton from '../components/common/FloatingHelpButton';
import palakkadFort from '../assets/palakkad/palakkad-fort.jpg';
import paddyField from '../assets/palakkad/paddy-field.jpg';
import alathurImg from '../assets/palakkad/alathur.png';
import chitturImg from '../assets/palakkad/chittur.png';
import mannarkkadImg from '../assets/palakkad/mannarkkad.png';
import ottapalamImg from '../assets/palakkad/ottapalam.png';
import festivalImg from '../assets/palakkad/festival.png';
import logoUrl from '../assets/logo.png';

type ThemeMode = 'light' | 'dark';

const imagePanels = [
  {
    src: festivalImg,
    title: 'Palakkad Life',
    caption: 'The vibrant temple festivals uniting common people and driving communal harmony.',
  },
  {
    src: alathurImg,
    title: 'Alathur',
    caption: 'Lush green agricultural heartland shaping the everyday natural life of Palakkad.',
  },
  {
    src: chitturImg,
    title: 'Chittur',
    caption: 'Serene rural rivers and authentic village life setting a calm environment for learning.',
  },
  {
    src: mannarkkadImg,
    title: 'Attappady, Mannarkkad',
    caption: 'The pristine nature and authentic tribal communities in the hills of Mannarkkad.',
  },
  {
    src: ottapalamImg,
    title: 'Ottapalam',
    caption: 'Everyday life by the majestic Bharathappuzha river, the cultural lifeline of the region.',
  },
  {
    src: palakkadFort,
    title: 'Palakkad Heritage',
    caption: 'The historic Palakkad Fort standing as a testament to the region’s rich past.',
  },
];

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard_theme') as ThemeMode | null;
    const resolvedTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(resolvedTheme);
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, []);

  const isDark = theme === 'dark';


  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('dashboard_theme', mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(username, password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imagePanels.length);
    }, 4000); // 4 seconds delay per image
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen overflow-x-hidden font-sans transition-colors duration-300',
        isDark ? 'bg-[#090d12] text-white' : 'bg-[#f5f1e8] text-slate-950'
      )}
    >
      <div className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative block overflow-hidden bg-black min-h-[40vh] lg:min-h-screen">
          {imagePanels.map((panel, index) => (
            <div
              key={panel.title}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000",
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              )}
            >
              <img
                src={panel.src}
                alt={panel.title}
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-12">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-300">
                  Palakkad identity
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
                  {panel.title}
                </h2>
                <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-white/80">
                  {panel.caption}
                </p>
              </div>
            </div>
          ))}

          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute left-8 top-8 flex items-center gap-3 rounded-[8px] border border-white/20 bg-black/30 px-4 py-3 text-white backdrop-blur-md">
            <ShieldCheck size={18} className="text-emerald-300" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Vijayasree</p>
              <p className="text-xs font-black uppercase tracking-[0.18em]">Palakkad Results Hub</p>
            </div>
          </div>
        </section>

        <main className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden px-6 py-10 sm:px-10">
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              isDark
                ? 'bg-[linear-gradient(145deg,rgba(31,111,235,0.16),transparent_34%),linear-gradient(315deg,rgba(16,185,129,0.12),transparent_38%)]'
                : 'bg-[linear-gradient(145deg,rgba(180,83,9,0.14),transparent_34%),linear-gradient(315deg,rgba(5,150,105,0.12),transparent_38%)]'
            )}
          />

          <div className="relative z-10 w-full max-w-[342px] sm:max-w-md page-enter">
            <div className="mb-8 flex items-center justify-end">
              <div
                className={cn(
                  'flex rounded-[8px] border p-1',
                  isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/70'
                )}
              >
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-[6px] transition-colors',
                    !isDark
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                  aria-label="Use light theme"
                >
                  <Sun size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-[6px] transition-colors',
                    isDark
                      ? 'bg-white text-slate-950'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                  )}
                  aria-label="Use dark theme"
                >
                  <Moon size={15} />
                </button>
              </div>
            </div>



            <div
              className={cn(
                'rounded-[20px] border p-6 sm:p-8',
                isDark
                  ? 'border-white/10 bg-[#111821] shadow-xl'
                  : 'border-gray-100 bg-white shadow-2xl shadow-blue-900/5'
              )}
            >
              <div className="mb-5 flex flex-col items-center justify-center text-center">
                <img src={logoUrl} alt="Vijayasree Logo" className="mb-3 h-28 w-auto object-contain" />
                <h1 className={cn("text-[26px] font-bold", isDark ? "text-white" : "text-[#1a2b4c]")}>Login</h1>
                <p className="mt-1 text-[14px] font-medium text-gray-500">Sign in to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="page-enter rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={16} className="shrink-0" />
                      <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="relative block">
                    <User size={20} className={cn('absolute left-4 top-1/2 -translate-y-1/2', isDark ? 'text-gray-400' : 'text-gray-500')} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={cn(
                        'h-12 w-full rounded-xl border px-12 text-[14px] outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]',
                        isDark
                          ? 'border-white/10 bg-[#1a222c] text-white placeholder:text-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 hover:border-gray-400'
                      )}
                      placeholder="Username"
                      autoComplete="username"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="relative block">
                    <Lock size={20} className={cn('absolute left-4 top-1/2 -translate-y-1/2', isDark ? 'text-gray-400' : 'text-gray-500')} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        'h-12 w-full rounded-xl border px-12 pr-12 text-[14px] outline-none transition-colors focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]',
                        isDark
                          ? 'border-white/10 bg-[#1a222c] text-white placeholder:text-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 hover:border-gray-400'
                      )}
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className={cn(
                        'absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg transition-colors',
                        isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      )}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#2563eb] text-[15px] font-semibold text-white transition-all hover:bg-[#1d4ed8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 shadow-lg shadow-blue-500/30"
                >
                  {isLoading ? (
                    <>
                      <span className="mr-3 h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>

                <div className="pt-4 text-center">
                  <Link to="/forgot-password" className="text-[14px] font-medium text-[#2563eb] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
      <FloatingHelpButton />
    </div>
  );
};

export default LoginPage;
