import express from 'express';
import Ticket from '../models/Ticket.js';

const router = express.Router();

const SLA_TARGETS = {
  urgent: 1 * 60, // 1 hour in minutes
  high: 4 * 60, // 4 hours
  medium: 24 * 60, // 24 hours
  low: 72 * 60 // 72 hours
};

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['resolved']
};

// Calculate derived fields
const enrichTicket = (ticket) => {
  const t = ticket.toObject();
  const now = new Date();
  const endTime = t.resolvedAt || now;
  const ageMinutes = Math.floor((endTime - t.createdAt) / (1000 * 60));
  
  const slaTarget = SLA_TARGETS[t.priority] || SLA_TARGETS.medium;
  const slaBreached = ageMinutes > slaTarget;
  
  return { ...t, ageMinutes, slaBreached };
};

// GET /tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
    let enriched = tickets.map(enrichTicket);

    if (breached === 'true') {
      enriched = enriched.filter(t => t.slaBreached);
    } else if (breached === 'false') {
      enriched = enriched.filter(t => !t.slaBreached);
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /tickets/stats
router.get('/stats', async (req, res) => {
  try {
    const tickets = await Ticket.find({});
    const enriched = tickets.map(enrichTicket);
    
    const stats = {
      total: enriched.length,
      open: enriched.filter(t => t.status === 'open').length,
      in_progress: enriched.filter(t => t.status === 'in_progress').length,
      resolved: enriched.filter(t => t.status === 'resolved').length,
      closed: enriched.filter(t => t.status === 'closed').length,
      breached: enriched.filter(t => t.slaBreached).length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tickets
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;
    const newTicket = new Ticket({
      subject,
      description,
      customerEmail,
      priority
    });
    await newTicket.save();
    res.status(201).json(enrichTicket(newTicket));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /tickets/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (status) {
      if (!validTransitions[ticket.status].includes(status)) {
        return res.status(400).json({ error: `Invalid transition from ${ticket.status} to ${status}` });
      }
      ticket.status = status;
    }
    
    await ticket.save();
    res.json(enrichTicket(ticket));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
