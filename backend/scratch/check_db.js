const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rwa-solana');
  const users = await User.find({}).sort({ createdAt: -1 }).limit(5);
  console.log('Recent Users:');
  users.forEach(u => {
    console.log(`- ${u.walletAddress}: ${u.kycStatus} (Created: ${u.createdAt})`);
  });
  process.exit(0);
}

check();
