import { useState, useEffect } from 'react';
import { getTickets, getStats, createTicket, updateTicketStatus } from './api';
import TicketBoard from './components/TicketBoard';
import CreateTicket from './components/CreateTicket';
import './index.css';

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState({ priority: '', breached: '' });
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        getTickets(filters),
        getStats()
      ]);
      setTickets(ticketsData);
      setStats(statsData);
      setError('');
    } catch (err) {
      setError('Failed to load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleCreate = async (ticketData) => {
    await createTicket(ticketData);
    setIsCreating(false);
    loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      // Optimistic update
      setTickets(tickets.map(t => t._id === id ? { ...t, status: newStatus } : t));
      await updateTicketStatus(id, newStatus);
      loadData(); // refresh to get new SLA data
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket');
      loadData(); // revert
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>DeskFlow Support</h1>
        <button className="btn-primary" onClick={() => setIsCreating(true)}>
          + New Ticket
        </button>
      </header>

      {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}

      {stats && (
        <div className="stats-strip">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Tickets</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.open}</span>
            <span className="stat-label">Open</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.in_progress}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{color: 'var(--priority-urgent)'}}>{stats.breached}</span>
            <span className="stat-label">SLA Breached</span>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="filters">
          <select 
            value={filters.priority} 
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select 
            value={filters.breached} 
            onChange={(e) => setFilters({...filters, breached: e.target.value})}
          >
            <option value="">All SLA Status</option>
            <option value="true">Breached</option>
            <option value="false">On Track</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '2rem'}}>Loading tickets...</div>
      ) : (
        <TicketBoard tickets={tickets} onStatusChange={handleStatusChange} />
      )}

      {isCreating && (
        <CreateTicket 
          onSubmit={handleCreate} 
          onClose={() => setIsCreating(false)} 
        />
      )}
    </div>
  );
}

export default App;
