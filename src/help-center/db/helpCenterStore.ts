import { helpDb } from './indexedDb';
import { ErrorRecord, FaqItem, KbArticle, InteractiveStep, SupportTicket } from '../types';

export async function fetchAllErrors(): Promise<ErrorRecord[]> {
  try {
    return await helpDb.getAll<ErrorRecord>('errors');
  } catch (err) {
    console.error('Error fetching errors from IndexedDB', err);
    return [];
  }
}

export async function fetchErrorById(id: string): Promise<ErrorRecord | null> {
  try {
    return await helpDb.getById<ErrorRecord>('errors', id);
  } catch (err) {
    return null;
  }
}

export async function fetchAllSteps(): Promise<InteractiveStep[]> {
  try {
    return await helpDb.getAll<InteractiveStep>('steps');
  } catch (err) {
    return [];
  }
}

export async function fetchAllFaqs(): Promise<FaqItem[]> {
  try {
    return await helpDb.getAll<FaqItem>('faqs');
  } catch (err) {
    return [];
  }
}

export async function fetchAllArticles(): Promise<KbArticle[]> {
  try {
    return await helpDb.getAll<KbArticle>('articles');
  } catch (err) {
    return [];
  }
}

export async function saveSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>): Promise<SupportTicket> {
  const newTicket: SupportTicket = {
    ...ticket,
    id: `ticket-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'PENDING'
  };
  await helpDb.put('supportTickets', newTicket);
  return newTicket;
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  return await helpDb.getAll<SupportTicket>('supportTickets');
}

export async function toggleBookmark(id: string, type: 'error' | 'article' | 'faq'): Promise<boolean> {
  const existing = await helpDb.getById<{ id: string; type: string; savedAt: string }>('bookmarks', id);
  if (existing) {
    await helpDb.delete('bookmarks', id);
    return false;
  } else {
    await helpDb.put('bookmarks', { id, type, savedAt: new Date().toISOString() });
    return true;
  }
}

export async function getBookmarks(): Promise<Array<{ id: string; type: string; savedAt: string }>> {
  return await helpDb.getAll<{ id: string; type: string; savedAt: string }>('bookmarks');
}

export async function saveRecentSearch(query: string): Promise<void> {
  if (!query.trim()) return;
  const id = `search-${query.toLowerCase().trim()}`;
  await helpDb.put('recentSearches', { id, query: query.trim(), timestamp: Date.now() });
}

export async function getRecentSearches(): Promise<string[]> {
  const items = await helpDb.getAll<{ id: string; query: string; timestamp: number }>('recentSearches');
  return items.sort((a, b) => b.timestamp - a.timestamp).map(i => i.query).slice(0, 8);
}
