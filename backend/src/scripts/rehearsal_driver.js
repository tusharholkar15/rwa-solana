const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const args = process.argv.slice(2);
    const mode = args[0]; // none, price_divergence, oracle_staleness, spike
    const nameSearch = args[1];

    if (!mode || !nameSearch) {
      console.log("Usage: node rehearsal_driver.js <mode> <asset_name_fragment>");
      console.log("Modes: none, price_divergence, oracle_staleness, spike");
      process.exit(1);
    }

    const asset = await Asset.findOne({ name: new RegExp(nameSearch, 'i') });
    if (!asset) {
      console.error(`Asset containing '${nameSearch}' not found in database.`);
      process.exit(1);
    }

    asset.rehearsalMode = mode;
    await asset.save();

    console.log("====================================================");
    console.log(`[REHEARSAL] Status Updated!`);
    console.log(`Target Asset: ${asset.name}`);
    console.log(`New Mode:     ${mode.toUpperCase()}`);
    console.log("====================================================");
    console.log(`The OracleService heartbeat will apply this in the next pulse.`);
    
    process.exit(0);
  } catch (err) {
    console.error("Rehearsal Driver Error:", err);
    process.exit(1);
  }
}

run();
