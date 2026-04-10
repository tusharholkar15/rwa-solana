const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/rwa-solana';
console.log('Testing connection to:', uri);
mongoose.connect(uri)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE:', err.message);
    process.exit(1);
  });
