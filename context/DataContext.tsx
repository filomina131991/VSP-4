import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Medium, Subject } from '../types';
import { apiClient, getAccessToken } from '../lib/apiClient';

interface DataContextType {
  mediums: Medium[];
  subjects: Subject[];
  loading: boolean;
  getSubjectsByMedium: (mediumId: string) => Subject[];
  getSubjectsByCategory: (mediumId: string) => Record<string, Subject[]>;
  refreshMediums: () => Promise<void>;
  refreshSubjects: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_KEY_MEDIUMS = 'datactx_mediums';
const CACHE_KEY_SUBJECTS = 'datactx_subjects';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data as T;
  } catch { return null; }
}

function saveCache(key: string, data: any) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mediums, setMediums] = useState<Medium[]>(() => loadCache<Medium[]>(CACHE_KEY_MEDIUMS) || []);
  const [subjects, setSubjects] = useState<Subject[]>(() => loadCache<Subject[]>(CACHE_KEY_SUBJECTS) || []);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  const refreshMediums = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await apiClient.get('/management/mediums');
      setMediums(res.data);
      saveCache(CACHE_KEY_MEDIUMS, res.data);
    } catch (err: any) {
      if (err?.response?.status !== 401) console.error('Failed to load mediums:', err);
    }
  }, []);

  const refreshSubjects = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await apiClient.get('/management/subjects');
      setSubjects(res.data);
      saveCache(CACHE_KEY_SUBJECTS, res.data);
    } catch (err: any) {
      if (err?.response?.status !== 401) console.error('Failed to load subjects:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    // Deduplicate concurrent calls
    if (fetchPromiseRef.current) return fetchPromiseRef.current;
    setLoading(true);
    const p: Promise<void> = (async () => {
      await Promise.all([refreshMediums(), refreshSubjects()]);
    })().finally(() => {
      setLoading(false);
      hasLoaded.current = true;
      fetchPromiseRef.current = null;
    });
    fetchPromiseRef.current = p;
    return p;
  }, [refreshMediums, refreshSubjects]);

  useEffect(() => {
    if (hasLoaded.current) return;

    const check = async () => {
      if (getAccessToken()) {
        await refreshAll();
        return;
      }
      setLoading(false);
    };
    check();

    const interval = setInterval(() => {
      if (getAccessToken() && !hasLoaded.current) {
        refreshAll();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [refreshAll]);

  const getSubjectsByMedium = useCallback((mediumId: string): Subject[] => {
    return subjects.filter(s => s.mediumId === mediumId && s.active);
  }, [subjects]);

  const getSubjectsByCategory = useCallback((mediumId: string): Record<string, Subject[]> => {
    const filtered = subjects.filter(s => s.mediumId === mediumId && s.active);
    const grouped: Record<string, Subject[]> = {
      FIRST_LANGUAGE: [],
      SECOND_LANGUAGE: [],
      THIRD_LANGUAGE: [],
      CORE: [],
    };
    filtered.forEach(s => {
      const cat = s.category || 'CORE';
      if (grouped[cat]) {
        grouped[cat].push(s);
      } else {
        grouped.CORE.push(s);
      }
    });
    return grouped;
  }, [subjects]);

  return (
    <DataContext.Provider value={{
      mediums,
      subjects,
      loading,
      getSubjectsByMedium,
      getSubjectsByCategory,
      refreshMediums,
      refreshSubjects,
      refreshAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}

export function useSubjects(mediumId?: string): Subject[] {
  const { subjects } = useData();
  if (mediumId) {
    return subjects.filter(s => s.mediumId === mediumId && s.active);
  }
  return subjects.filter(s => s.active);
}

export function useMediums(): Medium[] {
  const { mediums } = useData();
  return mediums;
}

export function useSchoolMediums(): Medium[] {
  const [schoolMediums, setSchoolMediums] = useState<Medium[]>([]);

  useEffect(() => {
    if (!getAccessToken()) return;
    const load = async () => {
      try {
        const res = await apiClient.get('/school/mediums');
        setSchoolMediums(res.data);
      } catch (err: any) {
        if (err?.response?.status !== 401) console.error('Failed to load school mediums:', err);
      }
    };
    load();
  }, []);

  return schoolMediums;
}

export function useSchoolSubjects(): string[] {
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!getAccessToken()) return;
    const load = async () => {
      try {
        const res = await apiClient.get('/school/active-subjects');
        if (Array.isArray(res.data)) {
          setSchoolSubjects(res.data);
        }
      } catch (err: any) {
        if (err?.response?.status !== 401) console.error('Failed to load school subjects:', err);
      }
    };
    load();
  }, []);

  return schoolSubjects;
}
