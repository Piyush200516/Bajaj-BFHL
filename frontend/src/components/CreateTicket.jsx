import { useState } from 'react';

export default function CreateTicket({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerEmail: '',
    priority: 'medium'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create New Ticket</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          
          <div className="form-group">
            <label>Subject</label>
            <input 
              type="text" 
              required 
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Customer Email</label>
            <input 
              type="email" 
              required 
              value={formData.customerEmail}
              onChange={e => setFormData({...formData, customerEmail: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              required 
              rows="4"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select 
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Low (72h)</option>
              <option value="medium">Medium (24h)</option>
              <option value="high">High (4h)</option>
              <option value="urgent">Urgent (1h)</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
}
