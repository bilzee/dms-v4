const https = require('https');

const postData = JSON.stringify({
  email: 'sim.coord@dms-sim.gov.ng',
  password: 'SimPass123!'
});

const loginReq = https.request('https://drms.v2.revlos.cloud/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    const token = data.data?.token;
    if (!token) { console.log('No token:', body.substring(0, 200)); return; }

    const commitReq = https.request('https://drms.v2.revlos.cloud/api/v1/commitments/591b9c2c-91c1-4c4c-aed9-94f051c761a6', {
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        try {
          const commitData = JSON.parse(body2);
          const c = commitData.data || commitData;
          console.log('Commitment ID:', c.id);
          console.log('Status:', c.status);
          console.log('Delivered Quantity:', c.deliveredQuantity);
          console.log('Total Committed Quantity:', c.totalCommittedQuantity);
          if (c.items) {
            c.items.forEach(item => {
              console.log(`  Item: ${item.name} - Planned: ${item.quantity}, Delivered: ${item.deliveredQuantity || 0}`);
            });
          }
        } catch(e) {
          console.log('Raw response:', body2.substring(0, 500));
        }
      });
    });
    commitReq.on('error', e => console.log('Error:', e.message));
    commitReq.end();
  });
});
loginReq.on('error', e => console.log('Login error:', e.message));
loginReq.write(postData);
loginReq.end();
