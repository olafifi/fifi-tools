import { useCallback, useEffect, useMemo, useState } from 'react';
import { openTicketStore, type TicketStore } from '../lib/ticketStore';
import { classifyText, draftFromFile, nextWorkdayBoundary, type TicketRecord } from '../lib/tickets';

export interface TemporaryTicketsState {
  tickets: TicketRecord[];
  loading: boolean;
  error: string;
  addText(value: string): Promise<boolean>;
  addFiles(files: File[]): Promise<boolean>;
  discard(id: string): Promise<void>;
  clearAll(): Promise<void>;
  dismissError(): void;
}

const defaultStorePromise = typeof indexedDB === 'undefined'
  ? null
  : openTicketStore();

export function useTemporaryTickets(storePromise = defaultStorePromise): TemporaryTicketsState {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(storePromise));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!storePromise) {
      setLoading(false);
      return;
    }
    const store = await storePromise;
    await store.clearExpired();
    setTickets(await store.list());
    setLoading(false);
  }, [storePromise]);

  useEffect(() => {
    let active = true;
    void refresh().catch(() => {
      if (active) {
        setLoading(false);
        setError('浏览器没有成功打开临时托盘，请刷新后再试。');
      }
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!storePromise) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void refresh().finally(schedule);
      }, Math.max(1000, nextWorkdayBoundary() - Date.now() + 250));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    schedule();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, storePromise]);

  const addDrafts = useCallback(async (drafts: ReturnType<typeof classifyText>[]) => {
    if (!storePromise || drafts.length === 0) return false;
    try {
      const store = await storePromise;
      await store.addMany(drafts);
      setTickets(await store.list());
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '这项内容没有放进去，请再试一次。');
      return false;
    }
  }, [storePromise]);

  return useMemo(() => ({
    tickets,
    loading,
    error,
    async addText(value: string) {
      if (!value.trim()) return false;
      return addDrafts([classifyText(value)]);
    },
    async addFiles(files: File[]) {
      return addDrafts(files.map(draftFromFile));
    },
    async discard(id: string) {
      if (!storePromise) return;
      const store = await storePromise;
      await store.remove(id);
      setTickets((current) => current.filter((ticket) => ticket.id !== id));
    },
    async clearAll() {
      if (!storePromise) return;
      const store = await storePromise;
      await store.clear();
      setTickets([]);
    },
    dismissError() { setError(''); }
  }), [addDrafts, error, loading, storePromise, tickets]);
}
