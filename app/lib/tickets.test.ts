import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_BYTES,
  MAX_TICKET_COUNT,
  MAX_TOTAL_BYTES,
  classifyText,
  draftFromFile,
  ticketByteSize,
  validateCapacity,
  workdayKeyAt,
  type TicketDraft,
  type TicketRecord
} from './tickets';

const textDraft = (payload = 'hello'): TicketDraft => ({
  type: 'text', name: '临时文字', mimeType: 'text/plain', size: new TextEncoder().encode(payload).byteLength, payload
});

const record = (draft: TicketDraft, id: string = crypto.randomUUID()): TicketRecord => ({
  ...draft, id, createdAt: Date.now(), workdayKey: '2026-07-26'
});

describe('ticket rules', () => {
  it('changes workday at local 06:00', () => {
    expect(workdayKeyAt(new Date(2026, 6, 26, 5, 59))).toBe('2026-07-25');
    expect(workdayKeyAt(new Date(2026, 6, 26, 6, 0))).toBe('2026-07-26');
  });

  it('classifies only absolute http links as links', () => {
    expect(classifyText(' https://example.com/path ')).toMatchObject({ type: 'link', payload: 'https://example.com/path' });
    expect(classifyText('ftp://example.com')).toMatchObject({ type: 'text' });
    expect(classifyText('example.com')).toMatchObject({ type: 'text' });
    expect(classifyText('see https://example.com')).toMatchObject({ type: 'text' });
  });

  it('classifies files and measures UTF-8 payloads', () => {
    expect(draftFromFile(new File(['x'], 'cat.png', { type: 'image/png' })).type).toBe('image');
    expect(draftFromFile(new File(['x'], 'note.pdf', { type: 'application/pdf' })).type).toBe('file');
    expect(ticketByteSize(textDraft('蛋白'))).toBe(6);
  });

  it('enforces count, per-file and total limits', () => {
    const existing = Array.from({ length: MAX_TICKET_COUNT }, (_, index) => record(textDraft(), String(index)));
    expect(validateCapacity(existing, [textDraft()])).toMatchObject({ ok: false, reason: 'count' });

    const oversized: TicketDraft = { type: 'file', name: 'large.bin', mimeType: '', size: MAX_FILE_BYTES + 1, payload: new Blob() };
    expect(validateCapacity([], [oversized])).toMatchObject({ ok: false, reason: 'item-size' });

    const nearlyFull: TicketRecord[] = [record({ type: 'file', name: 'base.bin', mimeType: '', size: MAX_TOTAL_BYTES, payload: new Blob() })];
    expect(validateCapacity(nearlyFull, [textDraft()])).toMatchObject({ ok: false, reason: 'total-size' });
    expect(validateCapacity([], [textDraft()])).toEqual({ ok: true });
  });
});
