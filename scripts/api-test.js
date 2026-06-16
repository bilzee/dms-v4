const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/action-signals?activeRole=ASSESSOR&unresolvedOnly=true&limit=100',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwOTFkMTM4OC03ZjVjLTQxMzgtYjMzYS0xODVkY2Q0MTZiYzEiLCJlbWFpbCI6ImFzc2Vzc29yQHRlc3QuY29tIiwicm9sZXMiOlsiQVNTRVNTT1IiXSwicGVybWlzc2lvbnMiOlsiQ1JFQVRFX0FTU0VTU01FTlQiLCJWSUVXX0FTU0VTU01FTlQiLCJFRElUX0FTU0VTU01FTlQiLCJWSUVXX0VOVElUSUVTIiwiVklFV19TSVRVQVRJT05fREFTSEJPQVJEIl0sImlhdCI6MTc4MDMxMzYzMCwiZXhwIjoxNzgwNDAwMDMwfQ.ysnAwlePeEiG1TI-jFtaWPqhLmr_Qx-ATMKJiz813CA'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    const signals = parsed.data?.signals || [];
    console.log('Total signals:', signals.length);

    const byUser = {};
    signals.forEach(s => {
      const uid = s.userId.slice(0, 8);
      if (!byUser[uid]) byUser[uid] = 0;
      byUser[uid]++;
    });
    console.log('By user:', byUser);
    console.log('First 3 signals:');
    signals.slice(0, 3).forEach(s => {
      console.log(`  userId: ${s.userId.slice(0,8)}, entity: ${s.entity?.name}, incident: ${s.incident?.name}, type: ${s.type}, reason: ${s.signalReason}`);
    });
  });
});

req.end();
