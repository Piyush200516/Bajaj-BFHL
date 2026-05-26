async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`http://localhost:5000${path}`, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw { response: { status: res.status, data } };
  return { status: res.status, data };
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  const failing = [];
  const passing = [];

  const expectThrow = async (promise, name) => {
    try {
      await promise;
      failed++;
      failing.push(name);
      console.error(`❌ ${name} (Expected error but succeeded)`);
    } catch (e) {
      if (e.response && e.response.status === 400) {
        passed++;
        passing.push(name);
        console.log(`✅ ${name}`);
      } else {
        failed++;
        failing.push(name);
        console.error(`❌ ${name} (Failed with wrong status: ${e.response?.status})`);
      }
    }
  };

  const expectSuccess = async (promise, name, checkFn) => {
    try {
      const res = await promise;
      if (checkFn && !checkFn(res.data)) {
        throw new Error("Check function failed");
      }
      passed++;
      passing.push(name);
      console.log(`✅ ${name}`);
      return res.data;
    } catch (e) {
      failed++;
      failing.push(name);
      console.error(`❌ ${name} (${e.response?.data?.error || e.message})`);
      return null;
    }
  };

  console.log('--- STARTING API TESTS ---');

  await expectThrow(request('POST', '/tickets', { description: 'Missing subject', customerEmail: 'test@example.com' }), 'POST /tickets (missing subject)');
  await expectThrow(request('POST', '/tickets', { subject: 'S', description: 'D', customerEmail: 'invalidemail' }), 'POST /tickets (invalid email)');
  await expectThrow(request('POST', '/tickets', { subject: 'S', description: 'D', customerEmail: 'test@example.com', priority: 'superhigh' }), 'POST /tickets (invalid priority)');

  const ticket = await expectSuccess(request('POST', '/tickets', {
    subject: "Cannot log in",
    description: "User unable to login",
    customerEmail: "test@example.com",
    priority: "high"
  }), 'POST /tickets (valid)', d => d.subject === 'Cannot log in');

  if (!ticket) return;

  // 3. Valid Transitions
  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'in_progress' }), 'PATCH /tickets/:id (open -> in_progress)', d => d.status === 'in_progress');
  const resolvedTicket = await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'resolved' }), 'PATCH /tickets/:id (in_progress -> resolved)', d => d.status === 'resolved' && d.resolvedAt !== null);

  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'closed' }), 'PATCH /tickets/:id (resolved -> closed)', d => d.status === 'closed');
  
  // Backward
  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'resolved' }), 'PATCH /tickets/:id (closed -> resolved)', d => d.status === 'resolved');
  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'in_progress' }), 'PATCH /tickets/:id (resolved -> in_progress)', d => d.status === 'in_progress' && !d.resolvedAt);

  // Invalid transitions
  await expectThrow(request('PATCH', `/tickets/${ticket._id}`, { status: 'closed' }), 'PATCH /tickets/:id (in_progress -> closed)');
  
  // Reset back to open to test open->resolved
  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'resolved' }), 'PATCH (in_progress -> resolved)');
  await expectSuccess(request('PATCH', `/tickets/${ticket._id}`, { status: 'closed' }), 'PATCH (resolved -> closed)');
  
  // Create another for open->resolved invalid test
  const t2 = await request('POST', '/tickets', { subject: "t2", description: "t2", customerEmail: "t2@example.com", priority: "low" });
  await expectThrow(request('PATCH', `/tickets/${t2.data._id}`, { status: 'resolved' }), 'PATCH /tickets/:id (open -> resolved)');
  await expectThrow(request('PATCH', `/tickets/${t2.data._id}`, { status: 'closed' }), 'PATCH /tickets/:id (open -> closed)');

  // GET Filters
  await expectSuccess(request('GET', '/tickets'), 'GET /tickets (all)', d => d.length >= 2);
  await expectSuccess(request('GET', '/tickets?status=open'), 'GET /tickets?status=open', d => d.length >= 1 && d[0].status === 'open');
  await expectSuccess(request('GET', '/tickets?priority=high'), 'GET /tickets?priority=high', d => d.length >= 1 && d[0].priority === 'high');

  // Stats
  await expectSuccess(request('GET', '/tickets/stats'), 'GET /tickets/stats', d => d.total >= 2 && d.open >= 1);

  // Delete
  await expectSuccess(request('DELETE', `/tickets/${t2.data._id}`), 'DELETE /tickets/:id');

  console.log(`\n--- SUMMARY ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Passing Endpoints: \n  ${passing.join('\n  ')}`);
  if (failed > 0) {
    console.log(`Failing Endpoints: \n  ${failing.join('\n  ')}`);
  }
}

runTests();
