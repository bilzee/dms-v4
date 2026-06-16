const BASE = 'http://localhost:3000';

async function main() {
  const loginRes = await fetch(BASE + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'assessor@test.com', password: 'testpassword123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  console.log('Token:', token ? 'OK' : 'FAILED');

  const entitiesRes = await fetch(BASE + '/api/entities/available-for-assessment', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const entities = await entitiesRes.json();
  const list = entities.data?.entities || entities.data?.items || entities.data || [];
  console.log('Entities keys:', Object.keys(entities.data || {}));
  if (Array.isArray(list) && list.length > 0) {
    console.log('First entity:', JSON.stringify({ id: list[0].id, name: list[0].name }));
  } else {
    console.log('Entities raw:', JSON.stringify(entities).substring(0, 500));
  }

  const incidentsRes = await fetch(BASE + '/api/v1/incidents', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const incidents = await incidentsRes.json();
  const incList = incidents.data?.incidents || incidents.data?.items || incidents.data || [];
  console.log('Incidents keys:', Object.keys(incidents.data || {}));
  if (Array.isArray(incList) && incList.length > 0) {
    console.log('First incident:', JSON.stringify({ id: incList[0].id }));
  }

  let entityId = null;
  if (Array.isArray(list)) entityId = list[0]?.id;
  else if (list?.items) entityId = list.items[0]?.id;
  console.log('EntityId:', entityId);

  let incidentId = null;
  if (Array.isArray(incList)) incidentId = incList[0]?.id;
  else if (incList?.items) incidentId = incList.items[0]?.id;
  console.log('IncidentId:', incidentId);

  if (entityId) {
    const batchRes = await fetch(BASE + '/api/v1/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        changes: [{
          type: 'assessment',
          action: 'create',
          data: { type: 'HEALTH', assessorName: 'Sync Test', location: 'Test', priority: 'MEDIUM', incidentId: incidentId || entityId },
          versionNumber: 1,
          entityUuid: entityId
        }]
      })
    });
    const batchResult = await batchRes.json();
    console.log('\n=== BATCH SYNC RESULT ===');
    console.log('Status:', batchRes.status);
    console.log('Result:', JSON.stringify(batchResult, null, 2));
  } else {
    console.log('No entity available for batch test');
  }
}

main().catch(console.error);
