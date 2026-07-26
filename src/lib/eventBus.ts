type RefreshEvent = 'mediums-updated' | 'subjects-updated' | 'data-updated';
type Listener = () => void;

const listeners: Record<RefreshEvent, Set<Listener>> = {
  'mediums-updated': new Set(),
  'subjects-updated': new Set(),
  'data-updated': new Set(),
};

export function onRefresh(event: RefreshEvent, listener: Listener): () => void {
  listeners[event].add(listener);
  return () => { listeners[event].delete(listener); };
}

export function emitRefresh(event: RefreshEvent): void {
  listeners[event].forEach(l => l());
}
