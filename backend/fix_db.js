const mongoose = require("mongoose");
const Asset = require("./src/models/Asset");
require("dotenv").config();

async function fixDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rwa-tokenization");
    console.log("Connected to MongoDB");

    const assets = await Asset.find({});
    console.log(`Found ${assets.length} assets`);

    for (const asset of assets) {
      let changed = false;
      if (asset.circuitBreaker && asset.circuitBreaker.tripReason === "NONE") {
        asset.circuitBreaker.tripReason = "none";
        changed = true;
      }
      if (asset.pausalReason && asset.pausalReason.includes("NONE")) {
        asset.pausalReason = asset.pausalReason.replace("NONE", "none");
        changed = true;
      }
      if (changed) {
        await asset.save();
        console.log(`Fixed asset: ${asset._id} (${asset.name})`);
      }
    }

    console.log("Database fix complete");
    process.exit(0);
  } catch (err) {
    console.error("Fix failed:", err);
    process.exit(1);
  }
}

fixDatabase();
