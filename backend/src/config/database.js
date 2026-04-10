const mongoose = require("mongoose");

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    console.log("📦 Using existing MongoDB connection");
    return;
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/rwa-solana";

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`📦 MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting reconnect...");
      isConnected = false;
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // In development, continue without DB for API testing
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Running without database in development mode");
    } else {
      throw error;
    }
  }
}

function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };
