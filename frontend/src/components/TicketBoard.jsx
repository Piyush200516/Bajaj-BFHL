import TicketCard from './TicketCard';

export default function TicketBoard({ tickets, onStatusChange }) {
  const columns = [
    { id: 'open', title: 'Open' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'resolved', title: 'Resolved' },
    { id: 'closed', title: 'Closed' }
  ];

  return (
    <div className="board">
      {columns.map(col => {
        const colTickets = tickets.filter(t => t.status === col.id);
        return (
          <div key={col.id} className="column">
            <div className="column-header">
              <span>{col.title}</span>
              <span className="badge" style={{ background: '#475569', color: '#fff' }}>
                {colTickets.length}
              </span>
            </div>
            <div className="column-content">
              {colTickets.map(ticket => (
                <TicketCard 
                  key={ticket._id} 
                  ticket={ticket} 
                  onStatusChange={onStatusChange} 
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
