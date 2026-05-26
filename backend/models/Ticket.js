import mongoose from 'mongoose';

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['resolved']
};

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

ticketSchema.pre('save', function(next) {
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
