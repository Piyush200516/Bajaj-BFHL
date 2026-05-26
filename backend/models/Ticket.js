import mongoose from 'mongoose';

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Customer email must be valid']
  },
  priority: {
    type: String,
    enum: {
      values: PRIORITIES,
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: STATUSES,
      message: 'Status must be one of: open, in_progress, resolved, closed'
    },
    default: 'open'
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

ticketSchema.pre('save', function setResolvedAt(next) {
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    } else if (this.status !== 'resolved' && this.status !== 'closed') {
      this.resolvedAt = null;
    }
  }
  next();
});

export default mongoose.model('Ticket', ticketSchema);
