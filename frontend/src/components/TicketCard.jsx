import { formatDistanceToNow } from 'date-fns';
import { MdWarning } from 'react-icons/md';

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['resolved']
};

export default function TicketCard({ ticket, onStatusChange }) {
  const allowedNext = validTransitions[ticket.status];

  return (
    <div className="ticket-card" style={{ borderLeftColor: `var(--priority-${ticket.priority})` }}>
      <div className="ticket-header">
        <h3 className="ticket-subject">{ticket.subject}</h3>
        <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
      </div>
      
      <div className="ticket-meta">
        <div>{ticket.customerEmail}</div>
        <div>Age: {formatDistanceToNow(new Date(ticket.createdAt))}</div>
      </div>

      {ticket.slaBreached && (
        <div className="breached-indicator">
          <MdWarning /> SLA Breached
        </div>
      )}

      <div className="ticket-actions">
        {allowedNext.map(status => (
          <button 
            key={status} 
            className="btn-action"
            onClick={() => onStatusChange(ticket._id, status)}
          >
            Move to {status.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
