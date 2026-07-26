import { useEffect, useState } from 'react';
import type { TicketRecord } from '../lib/tickets';

interface TicketCardProps {
  ticket: TicketRecord;
  departing?: boolean;
  clearing?: boolean;
  onDiscard?(ticket: TicketRecord): void;
}

const kindLabels = { text: 'TEXT', link: 'LINK', image: 'IMAGE', file: 'FILE' } as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TicketCard({ ticket, departing, clearing, onDiscard }: TicketCardProps) {
  const [objectUrl, setObjectUrl] = useState('');
  useEffect(() => {
    if (typeof ticket.payload === 'string') return;
    const next = URL.createObjectURL(ticket.payload);
    setObjectUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [ticket.payload]);

  const isText = typeof ticket.payload === 'string';
  const timestamp = new Date(ticket.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <article className={`ticket-card ticket-card--${ticket.type}${departing ? ' is-departing' : ''}${clearing ? ' is-clearing' : ''}`}>
      <div className="ticket-card__stamp">{kindLabels[ticket.type]} · {timestamp}</div>
      {ticket.type === 'image' && objectUrl ? (
        <a className="ticket-card__image" href={objectUrl} target="_blank" rel="noreferrer" aria-label={`查看图片 ${ticket.name}`}>
          <img src={objectUrl} alt="" />
        </a>
      ) : (
        <div className="ticket-card__body">
          <strong>{ticket.name}</strong>
          {isText && <p>{ticket.payload as string}</p>}
          {!isText && <span>{formatBytes(ticket.size)}</span>}
        </div>
      )}
      <div className="ticket-card__actions">
        {isText && <button type="button" onClick={() => void navigator.clipboard?.writeText(ticket.payload as string)}>复制</button>}
        {ticket.type === 'link' && <a href={ticket.payload as string} target="_blank" rel="noreferrer">打开</a>}
        {!isText && objectUrl && <a href={objectUrl} download={ticket.name}>下载</a>}
        {onDiscard && <button type="button" className="ticket-card__discard" onClick={() => onDiscard(ticket)} aria-label={`粉碎 ${ticket.name}`}>丢掉</button>}
      </div>
      <i className="ticket-card__perforation" aria-hidden="true" />
    </article>
  );
}
