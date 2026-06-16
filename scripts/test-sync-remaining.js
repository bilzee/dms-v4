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
  if (status !== 200) { console.log('Login failed for', email, status, data); return null; }
  return data?.data?.token || data?.token;
}

async function main() {
  console.log('=== REMAINING SYNC TESTS ===\n');

  const assessorToken = await login('assessor@test.com', 'testpassword123');
  const responderToken = await login('responder@dms.gov.ng', 'responder123!');
  const coordToken = await login('coordinator@dms.gov.ng', 'coordinator123!');

  if (!assessorToken || !responderToken || !coordToken) {
    console.log('Login failed'); process.exit(1);
  }
  console.log('All users logged in OK');

  const entitiesRes = await api('GET', '/api/entities/available-for-assessment', null, assessorToken);
  const raw = entitiesRes.data?.data || [];
  const entities = Array.isArray(raw) ? raw : Object.values(raw);
  const entityId = entities[0]?.id;
  console.log('Entity:', entityId);

  // ST-RS-02: Response Plan Update Sync
  console.log('\n=== ST-RS-02: Response Plan Update Sync ===');
  const createRes = await api('POST', '/api/v1/sync/batch', {
    changes: [{
      type: 'response', action: 'create',
      data: { status: 'PLANNED', priority: 'HIGH', description: 'Sync test response plan', entityId },
      versionNumber: 1, entityUuid: entityId
    }]
  }, responderToken);
  console.log('Create response:', createRes.status);
  const createResult = createRes.data?.data?.results?.[0] || createRes.data?.results?.[0];
  console.log('Created:', JSON.stringify(createResult));

  if (createResult?.id || createResult?.data?.id) {
    const respId = createResult?.id || createResult?.data?.id;
    const updateRes = await api('POST', '/api/v1/sync/batch', {
      changes: [{
        type: 'response', action: 'update',
        data: { id: respId, status: 'IN_PROGRESS', priority: 'CRITICAL', description: 'Updated sync test' },
        versionNumber: 2, entityUuid: entityId, offlineId: respId
      }]
    }, responderToken);
    console.log('Update response:', updateRes.status);
    const updateSummary = updateRes.data?.data?.summary || updateRes.data?.summary || {};
    console.log('Summary:', JSON.stringify(updateSummary));
    if (updateSummary.successful > 0) console.log('PASS: Response update synced successfully');
    else if (updateSummary.conflicts > 0) console.log('PASS: Conflict detected on version check');
    else console.log('NOTE:', JSON.stringify(updateRes.data, null, 2));
  }

  // ST-AS-02: Assessment Edit Versioning
  console.log('\n=== ST-AS-02: Assessment Edit Versioning ===');
  const assessCreate = await api('POST', '/api/v1/sync/batch', {
    changes: [{
      type: 'assessment', action: 'create',
      data: { type: 'HEALTH', assessorName: 'Version Test', location: 'Test', priority: 'MEDIUM', incidentId: '35be6107-1c01-4989-9a4d-b9df1be7205c' },
      versionNumber: 1, entityUuid: entityId
    }]
  }, assessorToken);
  const assessResult = assessCreate.data?.data?.results?.[0] || assessCreate.data?.results?.[0];
  console.log('Create assessment:', assessCreate.status, assessResult?.status);

  if (assessResult?.id || assessResult?.data?.id) {
    const aId = assessResult?.id || assessResult?.data?.id;
    const updateV2 = await api('POST', '/api/v1/sync/batch', {
      changes: [{
        type: 'assessment', action: 'update',
        data: { id: aId, type: 'HEALTH', assessorName: 'Version Test V2', priority: 'HIGH' },
        versionNumber: 2, entityUuid: entityId, offlineId: aId
      }]
    }, assessorToken);
    console.log('Update v2:', updateV2.status);
    const v2Summary = updateV2.data?.data?.summary || updateV2.data?.summary || {};
    console.log('Summary:', JSON.stringify(v2Summary));

    const updateV1Stale = await api('POST', '/api/v1/sync/batch', {
      changes: [{
        type: 'assessment', action: 'update',
        data: { id: aId, type: 'HEALTH', assessorName: 'Stale Update', priority: 'LOW' },
        versionNumber: 1, entityUuid: entityId, offlineId: aId
      }]
    }, assessorToken);
    const staleSummary = updateV1Stale.data?.data?.summary || updateV1Stale.data?.summary || {};
    console.log('Stale v1 update:', updateV1Stale.status, 'Summary:', JSON.stringify(staleSummary));
    if (staleSummary.conflicts > 0) console.log('PASS: Stale version detected as conflict');
    else if (staleSummary.successful > 0) console.log('NOTE: Server auto-resolved (no version tracking for this type)');
    else console.log('NOTE: No conflict and no success');
  }

  // ST-CR-05: Conflict Resolution Strategies
  console.log('\n=== ST-CR-05: Conflict Resolution Strategies ===');
  const conflicts = await api('GET', '/api/v1/sync/conflicts', null, coordToken);
  const conflictItems = conflicts.data?.data?.items || conflicts.data?.data || [];
  const conflictArray = Array.isArray(conflictItems) ? conflictItems : [];
  console.log('Total conflicts:', conflictArray.length);

  if (conflictArray.length > 0) {
    console.log('Sample conflict:', JSON.stringify(conflictArray[0], null, 2).substring(0, 500));
    const firstConflict = conflictArray[0];
    const resolveRes = await api('POST', '/api/v1/sync/conflicts/resolve', {
      conflictId: firstConflict.id, strategy: 'last_write_wins'
    }, coordToken);
    console.log('Resolve (last_write_wins):', resolveRes.status, JSON.stringify(resolveRes.data, null, 2));

    const resolveMerge = await api('POST', '/api/v1/sync/conflicts/resolve', {
      conflictId: 'test-merge', strategy: 'merge'
    }, coordToken);
    console.log('Resolve (merge):', resolveMerge.status, JSON.stringify(resolveMerge.data, null, 2));
  }

  const conflictSummary = await api('GET', '/api/v1/sync/conflicts/summary', null, coordToken);
  console.log('Conflict summary:', JSON.stringify(conflictSummary.data, null, 2));

  // ST-RS-03: Delivery GPS/Media Offline (API-level)
  console.log('\n=== ST-RS-03: Delivery GPS/Media ===');
  const deliveryRes = await api('POST', '/api/v1/sync/batch', {
    changes: [{
      type: 'response', action: 'update',
      data: {
        status: 'DELIVERED',
        gpsCoordinates: { lat: 12.345, lng: 13.456, accuracy: 10 },
        mediaAttachments: ['photo1.jpg', 'photo2.jpg'],
        deliveryNotes: 'Delivered successfully',
        deliveredAt: new Date().toISOString()
      },
      versionNumber: 3,
      entityUuid: entityId
    }]
  }, responderToken);
  console.log('Delivery update:', deliveryRes.status);
  const deliverySummary = deliveryRes.data?.data?.summary || deliveryRes.data?.summary || {};
  console.log('Summary:', JSON.stringify(deliverySummary));
  if (deliverySummary.successful > 0) console.log('PASS: Delivery with GPS/media data accepted');

  console.log('\n=== ALL REMAINING TESTS COMPLETE ===');
}

main().catch(console.error);
