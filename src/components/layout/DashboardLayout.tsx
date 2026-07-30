import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  BarChart2, 
  FileBarChart, 
  FolderOpen, 
  User, 
  ClipboardList, 
  GraduationCap, 
  PenLine,
  LogOut,
  Menu,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Settings,
  Search,
  Megaphone,
  AlertCircle,
  Bell,
  Settings2,
  FileEdit,
  FileText,
  BookOpen,
  Printer,
  Sun,
  Moon,
  X,
  DatabaseBackup,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/apiClient';
import PageTransition from '../common/PageTransition';
import FirstTimePasswordModal from '../common/FirstTimePasswordModal';
import FloatingHelpButton from '../common/FloatingHelpButton';

const stripHtml = (html: string) => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    return html.replace(/<[^>]*>/g, '');
  }
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [activeAlerts, setActiveAlerts] = React.useState<{id:string, title:string, content:string, target:string}[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [dismissedAlerts, setDismissedAlerts] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDismissed = [...dismissedAlerts, id];
    setDismissedAlerts(nextDismissed);
    localStorage.setItem('dismissed_alerts', JSON.stringify(nextDismissed));
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (user) {
      const url = user.role === 'SCHOOL' ? `/alerts/active?schoolId=${user.id}` : `/alerts/active`;
      apiClient.get(url)
        .then(res => setActiveAlerts(res.data))
        .catch(err => console.error("Failed to load alerts", err));
    }
  }, [user]);

  const PATH_TITLES: Record<string, string> = {
    'advanced-analysis': 'Advanced Analysis',
    'pdf-report': 'PDF Analysis Report',
    'find-school': 'Find School Results',
    'resources': 'Resources Hub',
    'management': 'Data Management',
    'users': 'User Management',
    'students-manage': 'Student Management',
    'exams': 'Exam Management',
    'alerts': 'Broadcast Alerts',
    'marks': 'Marks Entry',
    'exam-config': 'School Exam Config',
    'notifications': 'School Notifications',
    'subject-analysis': 'Subject Analysis',
    'drill-down': 'Analysis Hub',
    'reports': 'School Reports',
    'settings': 'Account Settings',
    'teachers': 'Teacher Management',
    'assign-tasks': 'Assign Tasks',
    'qp-repo': 'QP Repo Dashboard',
    'backup': 'Backup & Restore Data'
  };

  interface MenuItem {
    label: string;
    path: string;
    icon: React.ComponentType<any>;
    hidden?: boolean;
  }

  const menuItems: Record<string, MenuItem[]> = {
    WEBMASTER: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Advanced Analysis', path: '/dashboard/advanced-analysis', icon: BarChart2 },
      { label: 'PDF Analysis Report', path: '/dashboard/pdf-report', icon: FileText },
      { label: 'Find School by Result', path: '/dashboard/find-school', icon: Search },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },
      { label: 'Data Management', path: '/dashboard/management', icon: Database },
      { label: 'Users Management', path: '/dashboard/users', icon: Users },
      { label: 'Exams Config', path: '/dashboard/exams', icon: ClipboardList },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },
      { label: 'Paper Generator', path: '/dashboard/paper-generator', icon: Printer },
      { label: 'Broadcast Alerts', path: '/dashboard/alerts', icon: Megaphone },
      { label: 'QP Repo Dashboard', path: '/dashboard/qp-repo', icon: BarChart2 },
      { label: 'Backup & Restore', path: '/dashboard/backup', icon: DatabaseBackup },
      { label: 'Help Center', path: '/help', icon: HelpCircle },
    ],
    DEO: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'QP Repo Dashboard', path: '/dashboard/qp-repo', icon: BarChart2 },
      { label: 'Advanced Analysis', path: '/dashboard/advanced-analysis', icon: BarChart2 },
      { label: 'PDF Analysis Report', path: '/dashboard/pdf-report', icon: FileText },
      { label: 'Find School by Result', path: '/dashboard/find-school', icon: Search },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },
      { label: 'Users Management', path: '/dashboard/users', icon: Users },
      { label: 'Exams Config', path: '/dashboard/exams', icon: ClipboardList },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },
      { label: 'Broadcast Alerts', path: '/dashboard/alerts', icon: Megaphone },
      { label: 'Help Center', path: '/help', icon: HelpCircle },
    ],
    DIET: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'QP Repo Dashboard', path: '/dashboard/qp-repo', icon: BarChart2 },
      { label: 'Advanced Analysis', path: '/dashboard/advanced-analysis', icon: BarChart2 },
      { label: 'PDF Analysis Report', path: '/dashboard/pdf-report', icon: FileText },
      { label: 'Find School by Result', path: '/dashboard/find-school', icon: Search },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },
      { label: 'Users Management', path: '/dashboard/users', icon: Users },
      { label: 'Exams Config', path: '/dashboard/exams', icon: ClipboardList },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },
      { label: 'Broadcast Alerts', path: '/dashboard/alerts', icon: Megaphone },
      { label: 'Help Center', path: '/help', icon: HelpCircle },
    ],
    SCHOOL: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Teacher Management', path: '/dashboard/teachers', icon: Users },
      { label: 'Student Management', path: '/dashboard/students-manage', icon: Users },
      { label: 'Marks Entry', path: '/dashboard/marks', icon: FileEdit },
      { label: 'Reports', path: '/dashboard/reports', icon: FileBarChart },
      { label: 'Notifications', path: '/dashboard/notifications', icon: Bell },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },

    ],
    SUBJECT_EXPERT: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },
      { label: 'Chapter Config', path: '/dashboard/chapters', icon: Settings2 },
      { label: 'Assign Tasks', path: '/dashboard/assign-tasks', icon: FileEdit },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },
      { label: 'Paper Generator', path: '/dashboard/paper-generator', icon: Printer },

    ],
    RESOURCE_PERSON: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Resources Hub', path: '/dashboard/resources', icon: FolderOpen },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },

    ],
    TEACHER: [
      { label: 'Analysis Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Marks Entry', path: '/dashboard/marks', icon: FileEdit },
      { label: 'Question Repository', path: '/dashboard/repository', icon: BookOpen },

    ]
  };

  const currentMenuItems = user ? menuItems[user.role] : [];

  const navRef = React.useRef<HTMLElement>(null);
  const [showUpArrow, setShowUpArrow] = React.useState(false);
  const [showDownArrow, setShowDownArrow] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = navRef.current;
    if (el) {
      const hasOverflow = el.scrollHeight > el.clientHeight;
      const isAtTop = el.scrollTop <= 2;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      setShowUpArrow(hasOverflow && !isAtTop);
      setShowDownArrow(hasOverflow && !isAtBottom);
    } else {
      setShowUpArrow(false);
      setShowDownArrow(false);
    }
  }, []);

  React.useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    checkScroll();

    const observer = new ResizeObserver(() => {
      checkScroll();
    });
    observer.observe(el);

    // Observe children as well to capture dynamic additions/removals
    Array.from(el.children).forEach(child => {
      observer.observe(child);
    });

    window.addEventListener('resize', checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [currentMenuItems, isSidebarOpen, checkScroll]);

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0d1117] overflow-hidden font-sans text-gray-900 dark:text-[#e6edf3]">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white dark:bg-[#161b22] border-r border-gray-200 dark:border-[#30363d] transition-all duration-300 flex flex-col shadow-sm z-50",
          "fixed md:relative h-full overflow-hidden",
          isSidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20 w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between shrink-0">
          {isSidebarOpen && <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">വിജയശ്രീ Analysis</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded transition-colors hidden md:block">
            <Menu size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden mt-4">
          <div className={cn(
            "absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-white dark:from-[#161b22] to-transparent pointer-events-none flex items-start justify-center pt-1 z-10 transition-opacity duration-200",
            showUpArrow ? "opacity-100" : "opacity-0"
          )}>
            <ChevronUp size={16} className="text-gray-400 dark:text-gray-500 animate-bounce" />
          </div>

          <nav 
            ref={navRef}
            onScroll={checkScroll}
            className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar"
          >
            {currentMenuItems.map((item) => {
              if (item.hidden) return null;
              return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={cn(
                  "sidebar-item flex items-center py-2.5 text-sm font-medium rounded-md",
                  isSidebarOpen ? "px-3" : "justify-center",
                  location.pathname === item.path 
                    ? "bg-blue-600 text-white shadow-sm dark:bg-[#1f6feb]" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] hover:text-gray-950 dark:hover:text-white"
                )}
              >
                <item.icon size={18} className="shrink-0" />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            )})}
          </nav>

          <div className={cn(
            "absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white dark:from-[#161b22] to-transparent pointer-events-none flex items-end justify-center pb-1 z-10 transition-opacity duration-200",
            showDownArrow ? "opacity-100" : "opacity-0"
          )}>
            <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 animate-bounce" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#30363d] shrink-0">
          <div className="mb-4">
            <div className={cn("flex items-center", isSidebarOpen ? "space-x-2 px-3" : "justify-center")}>
              <div className="status-dot connection-ok shrink-0"></div>
              {isSidebarOpen && <span className="text-[10px] uppercase font-bold text-gray-400">DB: Connected</span>}
            </div>
          </div>
          <div className={cn("flex items-center justify-between", isSidebarOpen ? "flex-row gap-2" : "flex-col gap-2")}>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className={cn(
                "flex items-center py-2 text-gray-500 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-md transition-colors text-sm font-medium",
                isSidebarOpen ? "px-3 flex-1" : "justify-center w-10 h-10"
              )}
              title="Logout"
            >
              <LogOut size={18} className="shrink-0" />
              {isSidebarOpen && <span className="ml-3">Logout</span>}
            </button>
            
            <button
              onClick={() => navigate('/dashboard/settings')}
              className={cn(
                "flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-md transition-colors"
              )}
              title="Settings"
            >
              <Settings size={18} className="shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors md:hidden text-gray-500 dark:text-gray-300 shrink-0"
            >
              <Menu size={20} />
            </button>
            <span className="block md:hidden text-xs font-black tracking-[0.15em] uppercase text-gray-900 dark:text-white whitespace-nowrap">
              വിജയശ്രീ Analysis
          </span>
            <div className="flex items-center space-x-2 text-sm text-gray-500 hidden sm:flex">
              <span className="text-gray-400 font-medium">Dashboard</span>
              {location.pathname !== '/dashboard' && location.pathname !== '/dashboard/home' && (
                <>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-gray-900 dark:text-white font-bold">
                    {PATH_TITLES[location.pathname.split('/').pop() || ''] || location.pathname.split('/').pop()?.replace('-', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-2.5 pr-2 sm:pr-4">
            {/* Quick Dark Mode Toggle */}
            <button
              onClick={() => {
                const currentDark = document.documentElement.classList.contains('dark');
                const nextTheme = currentDark ? 'light' : 'dark';
                document.documentElement.classList.toggle('dark', !currentDark);
                localStorage.setItem('dashboard_theme', nextTheme);
                apiClient.post('/preferences', { theme: nextTheme }).catch(() => {});
              }}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#21262d]"
              title="Toggle Theme"
            >
              <Sun size={18} className="hidden dark:block text-amber-400" />
              <Moon size={18} className="block dark:hidden text-slate-600" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#21262d]"
              >
                <Bell size={18} />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#161b22]"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#161b22] rounded-2xl shadow-xl border border-gray-100 dark:border-[#30363d] overflow-hidden z-50 animate-scale-in origin-top-right">
                  <div className="p-4 border-b border-gray-50 dark:border-[#30363d] flex items-center justify-between bg-slate-50/50 dark:bg-[#1f242c]">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">{activeAlerts.length} New</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {activeAlerts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500">No new notifications</div>
                    ) : (
                      activeAlerts.map(alert => (
                        <div 
                          key={alert.id}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate('/dashboard/notifications');
                          }}
                          className="p-4 border-b border-gray-50 dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] cursor-pointer transition-colors"
                        >
                          <h4 className={`text-sm font-bold truncate ${alert.target === 'UNCONFIRMED' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{alert.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{stripHtml(alert.content)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div 
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/dashboard/notifications');
                    }}
                    className="p-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-colors"
                  >
                    View all notifications
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end hidden sm:flex pl-1">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-none single-line-label max-w-[120px]">{user?.displayName}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 single-line-label max-w-[120px]">{user?.role}</p>
            </div>
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold hover:bg-blue-700 dark:bg-[#1f6feb] transition-colors focus:outline-none shadow-sm"
              >
                {user?.displayName?.[0]}
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#161b22] rounded-2xl shadow-xl border border-gray-100 dark:border-[#30363d] overflow-hidden z-50 animate-scale-in origin-top-right">
                  <div className="p-4 border-b border-gray-50 dark:border-[#30363d] flex flex-col bg-slate-50/50 dark:bg-[#1f242c]">
                    <span className="font-black text-gray-900 dark:text-white text-sm truncate">{user?.displayName || user?.name || user?.username}</span>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">{user?.role}</span>
                    {(user?.phone || user?.email) ? (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-xs font-bold text-gray-600 dark:text-gray-300 space-y-1">
                        {user?.phone && <div className="truncate flex items-center gap-1.5"><span className="text-gray-400 font-normal">📱</span> {user.phone}</div>}
                        {user?.email && <div className="truncate flex items-center gap-1.5"><span className="text-gray-400 font-normal">✉️</span> {user.email}</div>}
                      </div>
                    ) : (user?.role === 'TEACHER' ) ? (
                      <div className="mt-2 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <span>⚠️ Mobile / Email Missing</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-2 space-y-1">
                    {(user?.role === 'SCHOOL' || user?.role === 'TEACHER') && (
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate(user?.role === 'TEACHER' ? '/dashboard/teacher-profile' : '/dashboard/school-profile');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-xl transition-colors font-bold"
                      >
                        <User size={16} className="text-indigo-500" />
                        <span>Profile Page</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-xl transition-colors font-bold"
                    >
                      <Settings size={16} className="text-gray-400" />
                      <span>Settings</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <LogOut size={16} className="text-rose-400" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Alert Banner for Schools */}
        {(() => {
          const isHome = location.pathname === '/dashboard' || location.pathname === '/dashboard/home';
          const bannerAlerts = activeAlerts.filter(a => 
            !dismissedAlerts.includes(a.id) &&
            (a.target === 'UNCONFIRMED' || a.target === 'SPECIFIC' || (a.target === 'ALL' && isHome))
          );

          if (bannerAlerts.length === 0) return null;

          return (
            <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0">
              <div className="max-w-6xl mx-auto space-y-3">
                {bannerAlerts.map(alert => {
                  const plainText = stripHtml(alert.content);
                  return (
                    <div key={alert.id} className="flex items-start justify-between gap-3 bg-amber-100/50 p-3 rounded-2xl border border-amber-200/60 shadow-sm animate-fade-in">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-full shrink-0">
                          <AlertCircle size={16} />
                        </div>
                        <div className="flex-1 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate('/dashboard/notifications')}>
                          <h4 className="text-sm font-bold text-amber-900 leading-tight">{alert.title}</h4>
                          <p className="text-xs text-amber-700 mt-0.5 line-clamp-2 leading-relaxed">
                            {plainText} <span className="text-[10px] font-black text-amber-900 underline ml-1 whitespace-nowrap">Read Full &rarr;</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Dismiss Alert"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-[5px] md:p-2.5 min-h-full">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>

        {/* Footer */}
        <footer className="h-12 bg-white dark:bg-[#161b22] border-t border-gray-200 dark:border-[#30363d] flex items-center justify-between px-8 shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>2026 © All Rights Reserved</span>
          <span className="hidden md:inline">Data provided by Vijayasree Palakkad</span>
        </footer>
      </main>

      <FirstTimePasswordModal isOpen={user?.passwordChanged === false} />
      <FloatingHelpButton />
    </div>
  );
};

export default DashboardLayout;
