import mongoose from "mongoose";

// ─────────────────────────────────────────
// CONNECTION OPTIONS
// ─────────────────────────────────────────

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// ─────────────────────────────────────────
// CONNECTION EVENTS
// ─────────────────────────────────────────

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed on app termination (SIGINT)");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed on app termination (SIGTERM)");
  process.exit(0);
});

// ─────────────────────────────────────────
// CONNECT WITH RETRY LOGIC
// ─────────────────────────────────────────

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, mongoOptions);
      console.log(`📦 MongoDB Host: ${conn.connection.host}`);
      console.log(`📂 MongoDB Database: ${conn.connection.name}`);
      return;
    } catch (err) {
      console.error(
        `❌ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`
      );

      if (attempt === retries) {
        console.error(
          "🚨 Could not connect to MongoDB after maximum retries. Exiting."
        );
        process.exit(1);
      }

      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

export default connectDB;