import { helpDb } from '../db/indexedDb';
import { ErrorAnalyticsEntry, SearchAnalyticsEntry } from '../types';

async function ensureDb(): Promise<void> {
  try {
    await helpDb.init();
  } catch {}
}

export async function trackErrorView(params: {
  schoolCode?: string;
  schoolName?: string;
  errorName: string;
  errorId: string;
  userQuery: string;
  user?: string;
  category: string;
}): Promise<void> {
  try {
    await ensureDb();
    const entry: ErrorAnalyticsEntry = {
      id: `err-analytics-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      schoolCode: params.schoolCode || 'UNKNOWN',
      schoolName: params.schoolName || 'UNKNOWN',
      errorName: params.errorName,
      errorId: params.errorId,
      userQuery: params.userQuery,
      resolved: false,
      timestamp: new Date().toISOString(),
      user: params.user || 'anonymous',
      category: params.category
    };
    await helpDb.put('analytics', entry);
  } catch (err) {
    console.error('Failed to track error view:', err);
  }
}

export async function markErrorResolved(analyticsId: string): Promise<void> {
  try {
    const entry = await helpDb.getById<ErrorAnalyticsEntry>('analytics', analyticsId);
    if (entry) {
      entry.resolved = true;
      entry.resolvedAt = new Date().toISOString();
      const viewedAt = new Date(entry.timestamp).getTime();
      entry.timeTaken = Date.now() - viewedAt;
      await helpDb.put('analytics', entry);
    }
  } catch (err) {
    console.error('Failed to mark error resolved:', err);
  }
}

export async function trackSearch(params: {
  query: string;
  matchedErrorId?: string;
  schoolCode?: string;
  schoolName?: string;
  user?: string;
  resolved: boolean;
}): Promise<void> {
  try {
    const entry: SearchAnalyticsEntry = {
      id: `search-analytics-${Date.now()}`,
      query: params.query,
      matchedErrorId: params.matchedErrorId,
      schoolCode: params.schoolCode,
      schoolName: params.schoolName,
      user: params.user,
      timestamp: new Date().toISOString(),
      resolved: params.resolved
    };
    await helpDb.put('searchAnalytics', entry);
  } catch (err) {
    console.error('Failed to track search:', err);
  }
}

export async function getMostSearchedErrors(limit = 10): Promise<{ errorName: string; errorId: string; count: number }[]> {
  try {
    const all = await helpDb.getAll<ErrorAnalyticsEntry>('analytics');
    const countMap = new Map<string, { errorName: string; errorId: string; count: number }>();
    for (const entry of all) {
      const key = entry.errorId;
      const existing = countMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(key, { errorName: entry.errorName, errorId: entry.errorId, count: 1 });
      }
    }
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getErrorStats(): Promise<{
  totalSearches: number;
  resolved: number;
  unresolved: number;
  avgResolutionTime: number;
}> {
  try {
    const all = await helpDb.getAll<ErrorAnalyticsEntry>('analytics');
    const resolved = all.filter(e => e.resolved);
    const totalTime = resolved.reduce((sum, e) => sum + (e.timeTaken || 0), 0);
    return {
      totalSearches: all.length,
      resolved: resolved.length,
      unresolved: all.length - resolved.length,
      avgResolutionTime: resolved.length > 0 ? Math.round(totalTime / resolved.length / 1000) : 0
    };
  } catch {
    return { totalSearches: 0, resolved: 0, unresolved: 0, avgResolutionTime: 0 };
  }
}
