const mongoose = require('mongoose');
const Asset = require('../src/models/Asset');
require('dotenv').config();

async function checkAssets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana');
    const count = await Asset.countDocuments();
    console.log(`Current Asset Count: ${count}`);
    if (count > 0) {
      const assets = await Asset.find().limit(5);
      assets.forEach(a => console.log(`- ${a.name} (${a.symbol}): ${a.availableSupply} shares available`));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAssets();
