const BASE = 'http://localhost:3000';
async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
async function login(email, password) {
  const { status, data } = await api('POST', '/api/v1/auth/login', { email, password });
  if (status != 200) return null;
  return data?.data?.token || data?.token;
}

async function main() {
  console.log('=== RETEST AFTER FIXES ===\n');
  const assessorToken = await login('assessor@test.com', 'testpassword123');
  const responderToken = await login('responder@dms.gov.ng', 'responder123!');
  const coordToken = await login('coordinator@dms.gov.ng', 'coordinator123!');
  if (!assessorToken || !responderToken || !coordToken) { console.log('Login failed'); process.exit(1); }

  const entitiesRes = await api('GET', '/api/entities/available-for-assessment', null, assessorToken);
  const raw = entitiesRes.data?.data || [];
  const entities = Array.isArray(raw) ? raw : Object.values(raw);
  const entityId = entities[0]?.id;
  console.log('Entity:', entityId);

  // ST-RS-02: Response Create
  console.log('\n=== ST-RS-02: Response Create ===');
  const createRes = await api('POST', '/api/v1/sync/batch', {
    changes: [{ type: 'response', action: 'create', data: { status: 'PLANNED', priority: 'HIGH', description: 'Fixed response test' }, versionNumber: 1, entityUuid: entityId }]
  }, responderToken);
  console.log('Status:', createRes.status);
  const result = createRes.data?.data?.results?.[0] || createRes.data?.results?.[0];
  console.log('Result:', JSON.stringify(result));
  if (result?.status === 'success') console.log('PASS: Response created successfully');
  else console.log('FAIL:', result?.message);

  // ST-RS-02: Response Update
  if (result?.id || result?.data?.id) {
    const respId = result.id || result.data.id;
    console.log('\n=== ST-RS-02: Response Update ===');
    const updRes = await api('POST', '/api/v1/sync/batch', {
      changes: [{ type: 'response', action: 'update', data: { id: respId, status: 'IN_PROGRESS', priority: 'CRITICAL', description: 'Updated' }, versionNumber: 2, entityUuid: entityId, offlineId: respId }]
    }, responderToken);
    console.log('Status:', updRes.status);
    const updSummary = updRes.data?.data?.summary || updRes.data?.summary || {};
    console.log('Summary:', JSON.stringify(updSummary));
    if (updSummary.successful > 0) console.log('PASS: Response updated successfully');
    else if (updSummary.conflicts > 0) console.log('PASS: Conflict detected');
    else console.log('NOTE:', JSON.stringify(updRes.data, null, 2));
  }

  // ST-CR-05: Conflict Resolve Endpoint
  console.log('\n=== ST-CR-05: Conflict Resolve Endpoint ===');
  
  const notFound = await api('POST', '/api/v1/sync/conflicts/resolve', { conflictId: 'nonexistent-id', strategy: 'keep_server' }, coordToken);
  console.log('Non-existent conflict:', notFound.status, notFound.status === 404 ? 'PASS (404)' : 'FAIL');
  
  const noData = await api('POST', '/api/v1/sync/conflicts/resolve', { conflictId: 'test-id', strategy: 'merge' }, coordToken);
  console.log('Merge without data:', noData.status, (noData.status === 400 || noData.status === 404) ? 'PASS' : 'FAIL');
  
  const noPerm = await api('POST', '/api/v1/sync/conflicts/resolve', { conflictId: 'test-id', strategy: 'last_write_wins' }, assessorToken);
  console.log('No permission:', noPerm.status, noPerm.status === 403 ? 'PASS (403)' : 'FAIL');
  
  const conflictsRes = await api('GET', '/api/v1/sync/conflicts', null, coordToken);
  const conflictItems = conflictsRes.data?.data?.items || [];
  const conflictArr = Array.isArray(conflictItems) ? conflictItems : [];
  console.log('Total conflicts:', conflictArr.length);
  
  if (conflictArr.length > 0) {
    const reRes = await api('POST', '/api/v1/sync/conflicts/resolve', { conflictId: conflictArr[0].id, strategy: 'last_write_wins' }, coordToken);
    console.log('Re-resolve:', reRes.status, reRes.status === 409 ? 'PASS (409)' : JSON.stringify(reRes.data));
  }

  const invalidStrat = await api('POST', '/api/v1/sync/conflicts/resolve', { conflictId: 'test', strategy: 'invalid_strategy' }, coordToken);
  console.log('Invalid strategy:', invalidStrat.status, invalidStrat.status === 400 ? 'PASS (400)' : 'FAIL');

  console.log('\n=== ALL RETESTS COMPLETE ===');
}

main().catch(console.error);
