type RefreshEvent = 'mediums-updated' | 'subjects-updated' | 'data-updated' | 'students-updated';
type Listener = () => void;

const listeners: Record<RefreshEvent, Set<Listener>> = {
  'mediums-updated': new Set(),
  'subjects-updated': new Set(),
  'data-updated': new Set(),
  'students-updated': new Set(),
};

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vsp_refresh_channel') : null;
if (channel) {
  channel.onmessage = (e) => {
    const event = e.data as RefreshEvent;
    if (listeners[event]) {
      listeners[event].forEach(l => l());
    }
  };
}

export function onRefresh(event: RefreshEvent, listener: Listener): () => void {
  listeners[event].add(listener);
  return () => { listeners[event].delete(listener); };
}

export function emitRefresh(event: RefreshEvent): void {
  listeners[event].forEach(l => l());
  if (channel) {
    channel.postMessage(event);
  }
}
