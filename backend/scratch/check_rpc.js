const https = require('https');

const data = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'getBalance',
  params: ['Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx']
});

const options = {
  hostname: 'api.devnet.solana.com',
  port: 443,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log('getBalance response:', body);
    checkSigs();
  });
});

req.on('error', (e) => {
  console.error('HTTPS error:', e);
});

req.write(data);
req.end();

function checkSigs() {
  const sigData = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'getSignaturesForAddress',
    params: ['Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx', { limit: 5 }]
  });

  const sigOptions = {
    hostname: 'api.devnet.solana.com',
    port: 443,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': sigData.length
    }
  };

  const sigReq = https.request(sigOptions, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
      console.log('getSignaturesForAddress response:', body);
    });
  });

  sigReq.on('error', (e) => {
    console.error('Signatures HTTPS error:', e);
  });

  sigReq.write(sigData);
  sigReq.end();
}
