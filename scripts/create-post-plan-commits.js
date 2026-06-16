(async () => {
  const loginResp = await fetch('https://drms.v2.revlos.cloud/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sim.coord@dms-sim.gov.ng', password: 'SimPass123!' })
  });
  const loginData = await loginResp.json();
  const token = loginData.data?.token || loginData.token;
  if (!token) { console.log('No token', JSON.stringify(loginData).substring(0, 200)); return; }
  console.log('Token obtained');

  // Create UNICEF post-plan commitment targeting FOOD response plan
  const commit2 = await fetch('https://drms.v2.revlos.cloud/api/v1/commitments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      donorId: 'a854d87c-0383-47d1-8cca-7f669ff55f3c',
      entityId: '02befdb4-05bf-4163-9931-79c8e5edbb12',
      incidentId: '4737080d-e839-4c4d-a23e-8da9d39e53b0',
      type: 'FOOD',
      items: [
        { name: 'Rice bags', quantity: 300, unit: 'bags', estimatedValue: 40 },
        { name: 'Cooking oil', quantity: 200, unit: 'bottles', estimatedValue: 10 }
      ],
      notes: 'Post-plan commitment: UNICEF fulfilling FOOD response plan items for Gwoza Community.'
    })
  });
  const c2 = await commit2.json();
  console.log('Commit2 (UNICEF/FOOD):', c2.success, c2.data?.id || c2.error);

  // Create Govt Aid post-plan commitment targeting FOOD response plan
  const commit3 = await fetch('https://drms.v2.revlos.cloud/api/v1/commitments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      donorId: '6c8c1636-c7fc-487a-b262-bf044e89e80c',
      entityId: '02befdb4-05bf-4163-9931-79c8e5edbb12',
      incidentId: '4737080d-e839-4c4d-a23e-8da9d39e53b0',
      type: 'FOOD',
      items: [
        { name: 'Rice bags', quantity: 200, unit: 'bags', estimatedValue: 40 }
      ],
      notes: 'Post-plan commitment: Govt Aid fulfilling partial FOOD response plan items for Gwoza Community.'
    })
  });
  const c3 = await commit3.json();
  console.log('Commit3 (GovtAid/FOOD):', c3.success, c3.data?.id || c3.error);
})();
