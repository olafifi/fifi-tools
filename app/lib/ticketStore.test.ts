import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { classifyText, type TicketDraft } from './tickets';
import { openTicketStore } from './ticketStore';

describe('ticket store', () => {
  it('persists, removes and clears tickets', async () => {
    const factory = new IDBFactory();
    const first = await openTicketStore(factory, 'tray-test');
    const [saved] = await first.addMany([classifyText('记得带伞')], new Date(2026, 6, 26, 12));

    const second = await openTicketStore(factory, 'tray-test');
    expect(await second.list()).toMatchObject([{ payload: '记得带伞' }]);
    await second.remove(saved.id);
    expect(await second.list()).toEqual([]);

    await second.addMany([classifyText('A'), classifyText('B')], new Date(2026, 6, 26, 13));
    await second.clear();
    expect(await second.list()).toEqual([]);
  });

  it('clears tickets from an earlier 06:00 workday', async () => {
    const store = await openTicketStore(new IDBFactory(), 'expiry-test');
    await store.addMany([classifyText('昨天')], new Date(2026, 6, 26, 5, 30));
    await store.addMany([classifyText('今天')], new Date(2026, 6, 26, 6, 30));

    expect(await store.clearExpired(new Date(2026, 6, 26, 6, 31))).toBe(1);
    expect(await store.list()).toMatchObject([{ payload: '今天' }]);
  });

  it('rejects an invalid batch without partial writes', async () => {
    const store = await openTicketStore(new IDBFactory(), 'capacity-test');
    const batch: TicketDraft[] = Array.from({ length: 21 }, (_, index) => classifyText(String(index)));
    await expect(store.addMany(batch)).rejects.toThrow('20');
    expect(await store.list()).toEqual([]);
  });

  it('reports count and byte totals', async () => {
    const store = await openTicketStore(new IDBFactory(), 'stats-test');
    await store.addMany([classifyText('蛋白')]);
    expect(await store.stats()).toEqual({ count: 1, bytes: 6 });
  });
});
