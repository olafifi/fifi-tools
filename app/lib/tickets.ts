export const MAX_TICKET_COUNT = 20;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export type TicketKind = 'text' | 'link' | 'image' | 'file';

export interface TicketDraft {
  type: TicketKind;
  name: string;
  mimeType: string;
  size: number;
  payload: string | Blob;
}

export interface TicketRecord extends TicketDraft {
  id: string;
  createdAt: number;
  workdayKey: string;
}

export type CapacityResult =
  | { ok: true }
  | { ok: false; reason: 'count' | 'item-size' | 'total-size'; message: string };

export function workdayKeyAt(value: number | Date = Date.now()) {
  const shifted = new Date((value instanceof Date ? value.getTime() : value) - 6 * 60 * 60 * 1000);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nextWorkdayBoundary(value: number | Date = Date.now()) {
  const now = value instanceof Date ? new Date(value) : new Date(value);
  const boundary = new Date(now);
  boundary.setHours(6, 0, 0, 0);
  if (boundary.getTime() <= now.getTime()) boundary.setDate(boundary.getDate() + 1);
  return boundary.getTime();
}

export function classifyText(raw: string): TicketDraft {
  const payload = raw.trim();
  let isLink = false;
  try {
    const url = new URL(payload);
    isLink = (url.protocol === 'http:' || url.protocol === 'https:') && payload === url.href.replace(/\/$/, payload.endsWith('/') ? '/' : '');
  } catch {
    isLink = false;
  }
  return {
    type: isLink ? 'link' : 'text',
    name: isLink ? new URL(payload).hostname : '临时文字',
    mimeType: 'text/plain',
    size: new TextEncoder().encode(payload).byteLength,
    payload
  };
}

export function draftFromFile(file: File): TicketDraft {
  return {
    type: file.type.startsWith('image/') ? 'image' : 'file',
    name: file.name || '未命名文件',
    mimeType: file.type,
    size: file.size,
    payload: file
  };
}

export function ticketByteSize(ticket: Pick<TicketDraft, 'payload' | 'size'>) {
  return typeof ticket.payload === 'string'
    ? new TextEncoder().encode(ticket.payload).byteLength
    : ticket.size;
}

export function validateCapacity(existing: TicketRecord[], incoming: TicketDraft[]): CapacityResult {
  if (existing.length + incoming.length > MAX_TICKET_COUNT) {
    return { ok: false, reason: 'count', message: '传送盘最多保留 20 张票据，先丢掉几张再放吧。' };
  }
  if (incoming.some((ticket) => ticket.type !== 'text' && ticket.type !== 'link' && ticketByteSize(ticket) > MAX_FILE_BYTES)) {
    return { ok: false, reason: 'item-size', message: '单个图片或文件不能超过 25 MB。' };
  }
  const total = [...existing, ...incoming].reduce((sum, ticket) => sum + ticketByteSize(ticket), 0);
  if (total > MAX_TOTAL_BYTES) {
    return { ok: false, reason: 'total-size', message: '今天的票据已经接近 100 MB，请先清理一些。' };
  }
  return { ok: true };
}
