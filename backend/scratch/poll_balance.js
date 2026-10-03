const { Connection, PublicKey } = require('@solana/web3.js');

async function poll() {
  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const pub = new PublicKey('Eoo37Vgds98BL7DU3r4Y9waJVXLDdCnbhK4KXMcyqjVx');
  console.log('Polling for Devnet SOL on', pub.toBase58());
  
  for (let i = 0; i < 30; i++) {
    try {
      const bal = await conn.getBalance(pub);
      const sol = bal / 1e9;
      console.log('Attempt ' + (i + 1) + ': ' + sol + ' SOL');
      if (sol >= 1.0) {
        console.log('>>> SOL RECEIVED! Current balance: ' + sol + ' SOL');
        return;
      }
    } catch (e) {
      console.log('RPC error: ' + e.message);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
}

poll();
