import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBookmarks, toggleBookmark } from '../db/helpCenterStore';
import { helpDb } from '../db/indexedDb';
import { ErrorRecord, FaqItem, KbArticle, InteractiveStep } from '../types';
import { fetchAllErrors, fetchAllFaqs, fetchAllArticles, fetchAllSteps } from '../db/helpCenterStore';

interface HelpCenterContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOnline: boolean;
  isDbReady: boolean;
  errors: ErrorRecord[];
  faqs: FaqItem[];
  articles: KbArticle[];
  steps: InteractiveStep[];
  bookmarks: Array<{ id: string; type: string; savedAt: string }>;
  isBookmarked: (id: string) => boolean;
  handleToggleBookmark: (id: string, type: 'error' | 'article' | 'faq') => Promise<void>;
  zoomedImage: { url: string; title: string } | null;
  setZoomedImage: (val: { url: string; title: string } | null) => void;
  refreshData: () => Promise<void>;
}

const HelpCenterContext = createContext<HelpCenterContextType | undefined>(undefined);

export const HelpCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('help_center_theme') as 'light' | 'dark') || 'light';
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [steps, setSteps] = useState<InteractiveStep[]>([]);
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; type: string; savedAt: string }>>([]);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('help_center_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const loadAllData = async () => {
    try {
      await helpDb.init();
      const [errList, faqList, artList, stepList, bkmList] = await Promise.all([
        fetchAllErrors(),
        fetchAllFaqs(),
        fetchAllArticles(),
        fetchAllSteps(),
        getBookmarks()
      ]);
      setErrors(errList);
      setFaqs(faqList);
      setArticles(artList);
      setSteps(stepList);
      setBookmarks(bkmList);
      setIsDbReady(true);
    } catch (err) {
      console.error('Failed to initialize Help Center data store:', err);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isBookmarked = (id: string) => {
    return bookmarks.some(b => b.id === id);
  };

  const handleToggleBookmark = async (id: string, type: 'error' | 'article' | 'faq') => {
    await toggleBookmark(id, type);
    const updated = await getBookmarks();
    setBookmarks(updated);
  };

  return (
    <HelpCenterContext.Provider value={{
      theme,
      toggleTheme,
      isOnline,
      isDbReady,
      errors,
      faqs,
      articles,
      steps,
      bookmarks,
      isBookmarked,
      handleToggleBookmark,
      zoomedImage,
      setZoomedImage,
      refreshData: loadAllData
    }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </HelpCenterContext.Provider>
  );
};

export const useHelpCenter = () => {
  const ctx = useContext(HelpCenterContext);
  if (!ctx) throw new Error('useHelpCenter must be used within HelpCenterProvider');
  return ctx;
};
