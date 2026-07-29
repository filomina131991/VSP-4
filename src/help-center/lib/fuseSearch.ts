import Fuse from 'fuse.js';
import { ErrorRecord, FaqItem, KbArticle } from '../types';

export interface SearchResultItem {
  id: string;
  type: 'error' | 'faq' | 'article';
  title: string;
  category: string;
  description: string;
  item: ErrorRecord | FaqItem | KbArticle;
  score?: number;
}

export function createHelpSearchEngine(
  errors: ErrorRecord[],
  faqs: FaqItem[],
  articles: KbArticle[]
) {
  const unifiedData: SearchResultItem[] = [
    ...errors.map(err => ({
      id: err.id,
      type: 'error' as const,
      title: err.title,
      category: err.category,
      description: err.symptoms.join(' | ') + ' ' + err.causes.join(' '),
      item: err
    })),
    ...faqs.map(faq => ({
      id: faq.id,
      type: 'faq' as const,
      title: faq.question,
      category: faq.category,
      description: faq.answer + ' ' + (faq.malayalamQuestion || ''),
      item: faq
    })),
    ...articles.map(art => ({
      id: art.id,
      type: 'article' as const,
      title: art.title,
      category: art.category,
      description: art.summary + ' ' + art.tags.join(' '),
      item: art
    }))
  ];

  const fuse = new Fuse(unifiedData, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'category', weight: 0.2 },
      { name: 'item.keywords', weight: 0.3 },
      { name: 'item.causes', weight: 0.2 },
      { name: 'item.solution', weight: 0.2 }
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true
  });

  return {
    search: (query: string): SearchResultItem[] => {
      if (!query.trim()) return [];
      const results = fuse.search(query);
      return results.map(r => ({
        ...r.item,
        score: r.score
      }));
    }
  };
}
