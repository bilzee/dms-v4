const http = require('http')

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function main() {
  const loginBody = JSON.stringify({ email: 'coordinator@dms.gov.ng', password: 'coordinator123!' })
  const loginResp = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginBody.length }
  }, loginBody)

  const token = loginResp.body?.data?.token
  if (!token) {
    console.log('LOGIN FAILED:', JSON.stringify(loginResp.body).substring(0, 500))
    process.exit(1)
  }
  console.log('Logged in, token:', token.substring(0, 20) + '...')

  const analyticsResp = await makeRequest({
    hostname: 'localhost', port: 3000, path: '/api/v1/coordinator/analytics', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })

  console.log('Status:', analyticsResp.status)
  console.log('Success:', analyticsResp.body?.success)
  
  const data = analyticsResp.body?.data || {}
  const keys = Object.keys(data)
  console.log('Sections:', keys.join(', '))
  
  for (const key of keys) {
    const val = data[key]
    const str = JSON.stringify(val)
    const summary = str.length > 500 ? str.substring(0, 500) + '...' : str
    
    if (Array.isArray(val)) {
      console.log(`\n[${key}] (${val.length} items):`, summary)
    } else if (val && typeof val === 'object') {
      const subKeys = Object.keys(val)
      console.log(`\n[${key}] keys:`, subKeys.join(', '))
      subKeys.forEach(sk => {
        const sv = JSON.stringify(val[sk])
        console.log(`  ${sk}:`, sv.length > 200 ? sv.substring(0, 200) + '...' : sv)
      })
    } else {
      console.log(`\n[${key}]:`, summary)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
