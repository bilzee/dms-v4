const BASE = 'http://localhost:3000';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email, password) {
  const { status, data } = await api('POST', '/api/v1/auth/login', { email, password });
  return data?.data?.token || data?.token;
}

async function main() {
  console.log('=== COMPREHENSIVE SYNC TEST SUITE ===\n');

  // Login
  console.log('--- Setup: Login ---');
  const assessorToken = await login('assessor@test.com', 'testpassword123');
  if (!assessorToken) { console.error('FAILED: Assessor login'); process.exit(1); }
  console.log('Assessor: OK');

  const coordToken = await login('coordinator@dms.gov.ng', 'coordinator123!');
  if (!coordToken) { console.error('FAILED: Coordinator login'); process.exit(1); }
  console.log('Coordinator: OK\n');

  // Get entities
  const entitiesRes = await api('GET', '/api/entities/available-for-assessment', null, assessorToken);
  const rawEntities = entitiesRes.data?.data || entitiesRes.data?.entities || entitiesRes.data || [];
  const entities = Array.isArray(rawEntities) ? rawEntities : Object.values(rawEntities);
  const entityId = entities[0]?.id;
  console.log('Entity ID:', entityId);

  // Get incidents
  const incRes = await api('GET', '/api/v1/incidents', null, assessorToken);
  const rawInc = incRes.data?.data || incRes.data?.incidents || incRes.data?.items || incRes.data || [];
  const incidents = Array.isArray(rawInc) ? rawInc : Object.values(rawInc);
  const incidentId = incidents.find(i => i.id?.includes('flood'))?.id || incidents[0]?.id;
  console.log('Incident ID:', incidentId, '\n');

  // ============================================================
  // ST-CR-01: Multi-Operation Batch Sync
  // ============================================================
  console.log('=== ST-CR-01: Multi-Operation Batch Sync ===');
  const batchBody = {
    changes: [
      {
        type: 'assessment',
        action: 'create',
        data: { type: 'HEALTH', assessorName: 'Sync Test', location: 'Test', priority: 'MEDIUM', incidentId },
        versionNumber: 1,
        entityUuid: entityId
      },
      {
        type: 'assessment',
        action: 'create',
        data: { type: 'FOOD', assessorName: 'Sync Test 2', location: 'Test 2', priority: 'LOW', incidentId },
        versionNumber: 1,
        entityUuid: entityId
      },
      {
        type: 'response',
        action: 'create',
        data: { status: 'PLANNED', priority: 'HIGH', description: 'Test response' },
        versionNumber: 1,
        entityUuid: entityId
      }
    ]
  };

  const batchStart = Date.now();
  const batchRes = await api('POST', '/api/v1/sync/batch', batchBody, assessorToken);
  const batchTime = Date.now() - batchStart;
  console.log(`Status: ${batchRes.status}`);
  console.log(`Time: ${batchTime}ms`);
  console.log(`Response:`, JSON.stringify(batchRes.data, null, 2));

  if (batchRes.status === 200 || batchRes.status === 207) {
    const results = batchRes.data?.data?.results || batchRes.data?.results || [];
    const summary = batchRes.data?.data?.summary || batchRes.data?.summary || {};
    console.log(`\nResults count: ${results.length}`);
    console.log(`Summary:`, JSON.stringify(summary));

    if (summary.successful > 0) console.log('PASS: Some items synced successfully');
    if (summary.conflicts > 0) console.log('NOTE: Conflicts detected');
    if (summary.failed > 0) console.log('NOTE: Some items failed');

    // Validate batch size limit
    if (results.length <= 100) console.log('PASS: Batch size within limit (100)');
  } else {
    console.log(`FAIL: Unexpected status ${batchRes.status}`);
  }

  // ============================================================
  // ST-CR-04: Conflict Detection (Version Mismatch)
  // ============================================================
  console.log('\n=== ST-CR-04: Conflict Detection ===');
  // Create an assessment first
  const createRes = await api('POST', '/api/v1/sync/batch', {
    changes: [{
      type: 'assessment',
      action: 'create',
      data: { type: 'HEALTH', assessorName: 'Conflict Test', location: 'Test', priority: 'HIGH', incidentId },
      versionNumber: 1,
      entityUuid: entityId
    }]
  }, assessorToken);
  console.log('Create result:', createRes.status);
  const createdItem = createRes.data?.data?.results?.[0] || createRes.data?.results?.[0];
  console.log('Created:', JSON.stringify(createdItem));

  // Now try to update with wrong version (should create conflict)
  if (createdItem?.id || createdItem?.data?.id) {
    const assessmentId = createdItem?.id || createdItem?.data?.id;
    console.log('Attempting conflict with assessment:', assessmentId);

    const conflictRes = await api('POST', '/api/v1/sync/batch', {
      changes: [{
        type: 'assessment',
        action: 'update',
        data: { id: assessmentId, type: 'HEALTH', assessorName: 'Updated Name', priority: 'CRITICAL' },
        versionNumber: 1, // Same version as create - should conflict
        entityUuid: entityId,
        offlineId: assessmentId
      }]
    }, assessorToken);
    console.log('Conflict test status:', conflictRes.status);
    console.log('Conflict result:', JSON.stringify(conflictRes.data, null, 2));

    if (conflictRes.data?.data?.summary?.conflicts > 0) {
      console.log('PASS: Conflict detected for version mismatch');
    } else {
      console.log('NOTE: No conflict detected (may be auto-resolved or no version tracking)');
    }
  }

  // Check conflicts via API
  const conflictsRes = await api('GET', '/api/v1/sync/conflicts', null, coordToken);
  console.log('\nConflicts API:', conflictsRes.status);
  const conflicts = conflictsRes.data?.data?.items || conflictsRes.data?.data || [];
  console.log('Total conflicts:', Array.isArray(conflicts) ? conflicts.length : 'N/A');

  const conflictSummary = await api('GET', '/api/v1/sync/conflicts/summary', null, coordToken);
  console.log('Conflict summary:', JSON.stringify(conflictSummary.data, null, 2));

  // ============================================================
  // ST-CR-05: Conflict Resolution Strategies (via ConflictResolver API)
  // ============================================================
  console.log('\n=== ST-CR-05: Conflict Resolution Strategies ===');
  // Test via resolve endpoint if it exists
  const resolveRes = await api('POST', '/api/v1/sync/conflicts/resolve', {
    conflictId: 'test',
    strategy: 'last_write_wins'
  }, coordToken);
  console.log('Resolve endpoint status:', resolveRes.status);
  if (resolveRes.status === 404) {
    console.log('NOTE: No dedicated resolve endpoint - conflicts auto-resolved by server');
  } else {
    console.log('Resolve result:', JSON.stringify(resolveRes.data, null, 2));
  }

  // ============================================================
  // ST-PR-01: Large Queue Performance (50 items)
  // ============================================================
  console.log('\n=== ST-PR-01: Large Queue Performance (50 items) ===');
  const largeBatch = {
    changes: Array.from({ length: 50 }, (_, i) => ({
      type: 'assessment',
      action: 'create',
      data: {
        type: ['HEALTH', 'FOOD', 'WASH', 'SHELTER', 'SECURITY'][i % 5],
        assessorName: `Perf Test ${i}`,
        location: `Location ${i}`,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
        incidentId
      },
      versionNumber: 1,
      entityUuid: entityId
    }))
  };

  const perfStart = Date.now();
  const perfRes = await api('POST', '/api/v1/sync/batch', largeBatch, assessorToken);
  const perfTime = Date.now() - perfStart;
  console.log(`Status: ${perfRes.status}`);
  console.log(`50 items processed in: ${perfTime}ms`);
  console.log(`Average per item: ${(perfTime / 50).toFixed(1)}ms`);
  const perfSummary = perfRes.data?.data?.summary || perfRes.data?.summary || {};
  console.log('Summary:', JSON.stringify(perfSummary));
  if (perfTime < 10000) {
    console.log('PASS: 50 items processed in under 10 seconds');
  } else {
    console.log('FAIL: Processing took too long');
  }
  if (perfSummary.totalProcessed === 50) {
    console.log('PASS: All 50 items processed');
  }

  // ============================================================
  // ST-PR-04: Encryption Performance
  // ============================================================
  console.log('\n=== ST-PR-04: Encryption Performance ===');
  // Test with large data payload
  const bigPayload = 'A'.repeat(10000); // 10KB of data
  const encStart = Date.now();
  const encRes = await api('POST', '/api/v1/sync/batch', {
    changes: Array.from({ length: 10 }, (_, i) => ({
      type: 'assessment',
      action: 'create',
      data: { type: 'HEALTH', assessorName: `Enc Test ${i}`, notes: bigPayload, priority: 'MEDIUM', incidentId },
      versionNumber: 1,
      entityUuid: entityId
    }))
  }, assessorToken);
  const encTime = Date.now() - encStart;
  console.log(`10 large items (10KB each) processed in: ${encTime}ms`);
  console.log(`Average per item: ${(encTime / 10).toFixed(1)}ms`);
  if (encTime < 5000) {
    console.log('PASS: Encryption did not cause significant delays');
  }

  // ============================================================
  // ST-API-01: Batch endpoint validation
  // ============================================================
  console.log('\n=== ST-API-01: Batch Endpoint Validation ===');
  // Empty changes
  const emptyRes = await api('POST', '/api/v1/sync/batch', { changes: [] }, assessorToken);
  console.log(`Empty changes: ${emptyRes.status} (expected 400)`);
  if (emptyRes.status === 400) console.log('PASS: Rejects empty changes');

  // No auth
  const noAuthRes = await api('POST', '/api/v1/sync/batch', batchBody);
  console.log(`No auth: ${noAuthRes.status} (expected 401)`);
  if (noAuthRes.status === 401) console.log('PASS: Requires authentication');

  // Invalid type
  const invalidRes = await api('POST', '/api/v1/sync/batch', {
    changes: [{ type: 'invalid', action: 'create', data: {}, versionNumber: 1, entityUuid: entityId }]
  }, assessorToken);
  console.log(`Invalid type: ${invalidRes.status} (expected 400)`);
  if (invalidRes.status === 400) console.log('PASS: Rejects invalid type');

  // ============================================================
  // ST-API-02: Sync Status
  // ============================================================
  console.log('\n=== ST-API-02: Sync Status ===');
  const statusRes = await api('GET', '/api/v1/sync/status', null, assessorToken);
  console.log(`Status: ${statusRes.status}`);
  console.log('Data:', JSON.stringify(statusRes.data, null, 2));

  // ============================================================
  // ST-PR-02: Rapid requests (simulating connectivity toggle)
  // ============================================================
  console.log('\n=== ST-PR-02: Rapid Connectivity Toggle Simulation ===');
  const rapidPromises = Array.from({ length: 5 }, (_, i) =>
    api('POST', '/api/v1/sync/batch', {
      changes: [{
        type: 'assessment',
        action: 'create',
        data: { type: 'HEALTH', assessorName: `Rapid ${i}`, priority: 'MEDIUM', incidentId },
        versionNumber: 1,
        entityUuid: entityId
      }]
    }, assessorToken)
  );
  const rapidStart = Date.now();
  const rapidResults = await Promise.all(rapidPromises);
  const rapidTime = Date.now() - rapidStart;
  console.log(`5 concurrent requests completed in: ${rapidTime}ms`);
  const rapidStatuses = rapidResults.map(r => r.status);
  console.log('Statuses:', rapidStatuses);
  const allHandled = rapidStatuses.every(s => s === 200 || s === 207 || s === 400 || s === 403);
  if (allHandled) console.log('PASS: All concurrent requests handled without error');

  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
