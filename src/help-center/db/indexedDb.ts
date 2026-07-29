import { ERRORS_DATABASE } from '../data/errorsData';
import { INTERACTIVE_STEPS_DATA } from '../data/interactiveStepsData';
import { FAQS_DATA } from '../data/faqsData';
import { ARTICLES_DATA } from '../data/articlesData';
import { WORKFLOW_NODES_DATA } from '../data/workflowData';
import { ROLE_GUIDES } from '../data/guidesData';
import { SupportTicket, AppSetting } from '../types';

const DB_NAME = 'VijayasreeHelpCenterDB';
const DB_VERSION = 1;

export class HelpCenterDB {
  private db: IDBDatabase | null = null;

  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        const stores = [
          'categories',
          'articles',
          'steps',
          'faqs',
          'errors',
          'keywords',
          'guides',
          'workflow',
          'settings',
          'bookmarks',
          'recentSearches',
          'supportTickets',
          'ratings'
        ];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            if (storeName === 'supportTickets' || storeName === 'recentSearches' || storeName === 'bookmarks' || storeName === 'ratings') {
              db.createObjectStore(storeName, { keyPath: 'id' });
            } else if (storeName === 'settings') {
              db.createObjectStore(storeName, { keyPath: 'key' });
            } else {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        });
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        await this.seedInitialData();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async seedInitialData() {
    if (!this.db) return;

    // Check if errors already seeded
    const tx = this.db.transaction(['errors', 'steps', 'faqs', 'articles', 'workflow', 'guides'], 'readwrite');
    const errorsStore = tx.objectStore('errors');
    
    const countReq = errorsStore.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        // Seed Errors
        ERRORS_DATABASE.forEach(err => errorsStore.put(err));

        // Seed Steps
        const stepsStore = tx.objectStore('steps');
        INTERACTIVE_STEPS_DATA.forEach(step => stepsStore.put(step));

        // Seed FAQs
        const faqsStore = tx.objectStore('faqs');
        FAQS_DATA.forEach(faq => faqsStore.put(faq));

        // Seed Articles
        const articlesStore = tx.objectStore('articles');
        ARTICLES_DATA.forEach(art => articlesStore.put(art));

        // Seed Workflow
        const wfStore = tx.objectStore('workflow');
        WORKFLOW_NODES_DATA.forEach(wf => wfStore.put(wf));

        // Seed Guides
        const guidesStore = tx.objectStore('guides');
        Object.values(ROLE_GUIDES).forEach(g => guidesStore.put({ id: g.roleId, ...g }));
      }
    };
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async getById<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? (req.result as T) : null);
      req.onerror = () => reject(req.error);
    });
  }

  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const helpDb = new HelpCenterDB();
