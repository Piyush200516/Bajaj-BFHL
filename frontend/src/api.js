import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://bajaj-bfhl-1-0ex0.onrender.com'
});

export const getTickets = async (filters) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.breached !== undefined && filters.breached !== '') params.append('breached', filters.breached);

  const response = await api.get(`/tickets?${params.toString()}`);
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/tickets/stats');
  return response.data;
};

export const createTicket = async (ticketData) => {
  const response = await api.post('/tickets', ticketData);
  return response.data;
};

export const updateTicketStatus = async (id, status) => {
  const response = await api.patch(`/tickets/${id}`, { status });
  return response.data;
};

export const deleteTicket = async (id) => {
  const response = await api.delete(`/tickets/${id}`);
  return response.data;
};
