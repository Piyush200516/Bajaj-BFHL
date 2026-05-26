process.env.NODE_ENV = 'test';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json();
  return { response, body };
};

const run = async () => {
  const { default: app, connectDB, closeDB } = await import('../server.js');
  const { default: Ticket } = await import('../models/Ticket.js');
  const { default: mongoose } = await import('mongoose');

  await connectDB();

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const results = [];
  const testRun = Date.now();
  const createdIds = [];

  try {
    let result = await request(baseUrl, '/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: `API smoke billing dashboard ${testRun}`,
        description: 'The customer sees a blank screen after login.',
        customerEmail: `api-smoke-${testRun}@example.com`,
        priority: 'urgent'
      })
    });
    assert(result.response.status === 201, 'create ticket should return 201');
    assert(result.body.status === 'open', 'new ticket should default to open');
    assert(result.body.ageMinutes === 0, 'new ticket ageMinutes should be 0');
    results.push('create ticket: pass');

    const ticketId = result.body._id;
    createdIds.push(ticketId);

    result = await request(baseUrl, '/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: '',
        description: 'Missing subject',
        customerEmail: 'not-email',
        priority: 'bad'
      })
    });
    assert(result.response.status === 400, 'invalid create payload should return 400');
    results.push('validation errors: pass');

    result = await request(baseUrl, '/tickets?priority=urgent');
    assert(result.response.status === 200 && result.body.some(ticket => ticket._id === ticketId), 'priority filter should return urgent ticket');
    results.push('filters: pass');

    result = await request(baseUrl, `/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(result.response.status === 400, 'open to resolved should be rejected');
    results.push('invalid transition: pass');

    result = await request(baseUrl, `/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' })
    });
    assert(result.response.status === 200 && result.body.status === 'in_progress', 'open to in_progress should pass');

    result = await request(baseUrl, `/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(result.response.status === 200 && result.body.resolvedAt, 'moving to resolved should set resolvedAt');
    const resolvedAt = result.body.resolvedAt;

    result = await request(baseUrl, `/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' })
    });
    assert(result.response.status === 200 && result.body.resolvedAt === null, 'moving back from resolved should clear resolvedAt');
    results.push('valid transitions and resolvedAt: pass');

    await Ticket.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(ticketId) },
      {
        $set: {
          createdAt: new Date(Date.now() - 90 * 60000),
          updatedAt: new Date(Date.now() - 90 * 60000)
        }
      }
    );

    result = await request(baseUrl, '/tickets?breached=true');
    assert(result.response.status === 200 && result.body.some(ticket => ticket._id === ticketId), 'urgent ticket older than 1 hour should breach SLA');
    assert(result.body.find(ticket => ticket._id === ticketId).ageMinutes >= 90, 'ageMinutes should use createdAt to now while unresolved');
    results.push('SLA breach and ageMinutes unresolved: pass');

    result = await request(baseUrl, `/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(result.response.status === 200 && result.body.slaBreached === true, 'resolved after SLA should remain breached');
    assert(result.body.resolvedAt !== resolvedAt, 'resolvedAt should be set again after re-resolving');
    results.push('SLA breach and ageMinutes resolved: pass');

    result = await request(baseUrl, '/tickets/stats');
    assert(result.response.status === 200, 'stats should return 200');
    assert(result.body.countsByStatus.resolved >= 1, 'stats should count resolved tickets');
    assert(result.body.countsByPriority.urgent >= 1, 'stats should count urgent tickets');
    assert(Number.isInteger(result.body.currentBreachedOpenTickets), 'stats should include current breached open tickets count');
    results.push('stats endpoint: pass');

    result = await request(baseUrl, `/tickets/${ticketId}`, { method: 'DELETE' });
    assert(result.response.status === 200, 'delete should return 200');
    results.push('delete ticket: pass');

    console.log(results.join('\n'));
  } finally {
    await Ticket.deleteMany({ _id: { $in: createdIds.map(id => new mongoose.Types.ObjectId(id)) } });
    server.close();
    await closeDB();
  }
};

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
