const mongoose = require('mongoose');
const Asset = require('../src/models/Asset');
require('dotenv').config();

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana');
  
  const total = await Asset.countDocuments({});
  const active = await Asset.countDocuments({ isActive: true });
  const inactive = await Asset.countDocuments({ isActive: false });
  const activeStatus = await Asset.countDocuments({ status: 'active' });

  console.log('=== Asset Diagnosis ===');
  console.log('Total assets:', total);
  console.log('isActive=true:', active);
  console.log('isActive=false:', inactive);
  console.log('status=active:', activeStatus);

  // Check combined filter (what the marketplace API actually uses)
  const marketplaceFilter = await Asset.countDocuments({ isActive: true });
  console.log('Marketplace query (isActive:true):', marketplaceFilter);

  // Show a few samples
  const samples = await Asset.find({}).select('name status isActive').limit(5).lean();
  console.log('\nSample assets:');
  samples.forEach(a => {
    console.log(`  - ${a.name} | status=${a.status} | isActive=${a.isActive}`);
  });

  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
