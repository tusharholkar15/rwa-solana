const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function test() {
  const query = 'SpaceX'; // Contains special char 'X' but let's try something harder
  console.log(`🔍 Testing search for: "${query}"`);
  try {
    const res = await axios.get(`${API_URL}/assets?search=${encodeURIComponent(query)}`);
    console.log(`✅ Search successful. Found ${res.data.assets.length} assets.`);
    res.data.assets.forEach(a => console.log(`   - ${a.name}`));
  } catch (e) {
    console.error(`❌ Search failed: ${e.message}`);
  }
}

test();
