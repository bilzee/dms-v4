async function main() {
  const base = 'https://drms.v2.revlos.cloud';
  const loginResp = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sim.coord@dms-sim.gov.ng', password: 'SimPass123!' })
  });
  const loginData = await loginResp.json();
  const token = loginData.data?.tokens?.accessToken || loginData.data?.token;
  
  if (!token) {
    console.log('Login failed:', JSON.stringify(loginData).substring(0, 500));
    return;
  }

  const donors = {
    'Red Cross': '8f0dbffd-3713-4cb2-a607-10fd3066b362',
    'UNICEF': 'a854d87c-0383-47d1-8cca-7f669ff55f3c',
    'Govt Aid': '6c8c1636-c7fc-487a-b262-bf044e89e80c'
  };

  for (const [name, id] of Object.entries(donors)) {
    const resp = await fetch(base + '/api/v1/donors/' + id + '/commitments', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await resp.json();
    if (data.success && data.data?.items) {
      console.log('\n' + name + ' commitments:');
      for (const c of data.data.items) {
        console.log('  ID: ' + c.id.substring(0, 8));
        console.log('  Status: ' + c.status);
        console.log('  Delivered/Total: ' + c.deliveredQuantity + ' / ' + c.totalCommittedQuantity);
        if (c.items && Array.isArray(c.items)) {
          console.log('  Items: ' + JSON.stringify(c.items.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit }))));
        }
        if (c.responseId) {
          console.log('  Linked Response: ' + c.responseId.substring(0, 8));
        }
        console.log('');
      }
    } else {
      console.log('\n' + name + ': error - ' + JSON.stringify(data).substring(0, 200));
    }
  }
}
main().catch(console.error);
