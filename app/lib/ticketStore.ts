import {
  ticketByteSize,
  validateCapacity,
  workdayKeyAt,
  type TicketDraft,
  type TicketRecord
} from './tickets';

const DEFAULT_DATABASE_NAME = 'fifi-temporary-ticket-tray';
const STORE_NAME = 'tickets';

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('本地内容读取失败。'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('本地内容写入失败。'));
    transaction.onerror = () => reject(transaction.error ?? new Error('本地内容写入失败。'));
  });
}

export interface TicketStore {
  list(): Promise<TicketRecord[]>;
  addMany(drafts: TicketDraft[], now?: number | Date): Promise<TicketRecord[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  clearExpired(now?: number | Date): Promise<number>;
  stats(): Promise<{ count: number; bytes: number }>;
}

export async function openTicketStore(
  factory: IDBFactory = indexedDB,
  databaseName = DEFAULT_DATABASE_NAME
): Promise<TicketStore> {
  const request = factory.open(databaseName, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  const database = await requestResult(request);

  const list = async () => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as TicketRecord[];
    return records.sort((a, b) => b.createdAt - a.createdAt);
  };

  return {
    list,
    async addMany(drafts, now = Date.now()) {
      if (drafts.length === 0) return [];
      const existing = await list();
      const capacity = validateCapacity(existing, drafts);
      if (!capacity.ok) throw new Error(capacity.message);
      const createdAt = now instanceof Date ? now.getTime() : now;
      const workdayKey = workdayKeyAt(createdAt);
      const records = drafts.map((draft, index): TicketRecord => ({
        ...draft,
        id: crypto.randomUUID(),
        createdAt: createdAt + index,
        workdayKey
      }));
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      records.forEach((record) => objectStore.add(record));
      await transactionDone(transaction);
      return records;
    },
    async remove(id) {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      await transactionDone(transaction);
    },
    async clear() {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      await transactionDone(transaction);
    },
    async clearExpired(now = Date.now()) {
      const currentKey = workdayKeyAt(now);
      const existing = await list();
      const expired = existing.filter((ticket) => ticket.workdayKey !== currentKey);
      if (expired.length === 0) return 0;
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      expired.forEach((ticket) => objectStore.delete(ticket.id));
      await transactionDone(transaction);
      return expired.length;
    },
    async stats() {
      const records = await list();
      return {
        count: records.length,
        bytes: records.reduce((total, ticket) => total + ticketByteSize(ticket), 0)
      };
    }
  };
}
