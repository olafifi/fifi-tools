import type { CSSProperties } from 'react';
import type { TicketRecord } from '../lib/tickets';
import { TicketCard } from './TicketCard';

interface TicketConveyorProps {
  tickets: TicketRecord[];
  ghosts: Array<TicketRecord & { clearing?: boolean }>;
  onDiscard(ticket: TicketRecord): void;
}

export function TicketConveyor({ tickets, ghosts, onDiscard }: TicketConveyorProps) {
  return (
    <div className="ticket-conveyor" aria-live="polite">
      <div className="ticket-conveyor__rail" aria-hidden="true" />
      {tickets.length === 0 && ghosts.length === 0 ? (
        <div className="ticket-empty">
          <b>托盘现在是空的</b>
          <span>今天临时要接力的东西，都可以先扔到这里。</span>
        </div>
      ) : (
        <div className="ticket-stack">
          {tickets.map((ticket, index) => (
            <div className="ticket-stack__item" key={ticket.id} style={{ '--ticket-index': index } as CSSProperties}>
              <TicketCard ticket={ticket} onDiscard={onDiscard} />
            </div>
          ))}
          {ghosts.map((ticket) => (
            <div className="ticket-stack__item ticket-stack__ghost" key={`ghost-${ticket.id}`}>
              <TicketCard ticket={ticket} departing clearing={ticket.clearing} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
