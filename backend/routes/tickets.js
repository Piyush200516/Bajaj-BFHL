import express from 'express';
import Ticket, { PRIORITIES, STATUSES } from '../models/Ticket.js';

const router = express.Router();

export const SLA_TARGETS = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320
};

export const VALID_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['resolved']
};

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const validationError = (message, details = []) => ({
  error: message,
  details
});

export const enrichTicket = (ticket) => {
  const t = ticket.toObject();
  const now = new Date();
  const endTime = t.resolvedAt || now;
  const ageMinutes = Math.max(0, Math.floor((endTime - t.createdAt) / 60000));
  const slaBreached = ageMinutes > (SLA_TARGETS[t.priority] || SLA_TARGETS.medium);

  return { ...t, ageMinutes, slaBreached };
};

const validateCreatePayload = ({ subject, description, customerEmail, priority, status }) => {
  const errors = [];

  if (!subject || !String(subject).trim()) errors.push('Subject is required');
  if (!description || !String(description).trim()) errors.push('Description is required');
  if (!customerEmail || !String(customerEmail).trim()) errors.push('Customer email is required');
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customerEmail).trim())) {
    errors.push('Customer email must be valid');
  }
  if (priority && !PRIORITIES.includes(priority)) {
    errors.push('Priority must be one of: low, medium, high, urgent');
  }
  if (status && !STATUSES.includes(status)) {
    errors.push('Status must be one of: open, in_progress, resolved, closed');
  }

  return errors;
};

router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    const filter = {};

    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json(validationError('Invalid status filter'));
      }
      filter.status = status;
    }

    if (priority) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json(validationError('Invalid priority filter'));
      }
      filter.priority = priority;
    }

    if (breached && !['true', 'false'].includes(breached)) {
      return res.status(400).json(validationError('Breached filter must be true or false'));
    }

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
    let enriched = tickets.map(enrichTicket);

    if (breached === 'true') {
      enriched = enriched.filter(ticket => ticket.slaBreached);
    } else if (breached === 'false') {
      enriched = enriched.filter(ticket => !ticket.slaBreached);
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const tickets = await Ticket.find({});
    const enriched = tickets.map(enrichTicket);

    res.json({
      total: enriched.length,
      countsByStatus: Object.fromEntries(
        STATUSES.map(status => [status, enriched.filter(ticket => ticket.status === status).length])
      ),
      countsByPriority: Object.fromEntries(
        PRIORITIES.map(priority => [priority, enriched.filter(ticket => ticket.priority === priority).length])
      ),
      currentBreachedOpenTickets: enriched.filter(ticket =>
        ['open', 'in_progress'].includes(ticket.status) && ticket.slaBreached
      ).length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateCreatePayload(req.body);
    if (errors.length) {
      return res.status(400).json(validationError('Ticket validation failed', errors));
    }

    const { subject, description, customerEmail, priority, status } = req.body;
    const ticket = new Ticket({
      subject: subject.trim(),
      description: description.trim(),
      customerEmail: customerEmail.trim(),
      priority: priority || 'medium',
      status: status || 'open'
    });

    await ticket.save();
    res.status(201).json(enrichTicket(ticket));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json(validationError(
        'Ticket validation failed',
        Object.values(error.errors).map(err => err.message)
      ));
    }
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json(validationError('Invalid ticket id'));
    }
    if (!status) {
      return res.status(400).json(validationError('Status is required'));
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json(validationError('Invalid status'));
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!VALID_TRANSITIONS[ticket.status].includes(status)) {
      return res.status(400).json(validationError(`Invalid transition from ${ticket.status} to ${status}`));
    }

    ticket.status = status;
    await ticket.save();
    res.json(enrichTicket(ticket));
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json(validationError('Invalid ticket id'));
    }

    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

export default router;
