import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import connectDB from "./config/db.js";

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ role: "superadmin" });

    if (existing) {
      console.log("⚠️  SuperAdmin already exists:");
      console.log(`   Email: ${existing.email}`);
      console.log("   Use this account to login.");
      process.exit(0);
    }

    const superAdmin = await User.create({
      name:     process.env.SUPER_ADMIN_NAME     || "Super Admin",
      email:    process.env.SUPER_ADMIN_EMAIL    || "admin@youragency.com",
      password: process.env.SUPER_ADMIN_PASSWORD || "Admin@123456",
      role:     "superadmin",
      isActive: true,
    });

    console.log("─────────────────────────────────────────");
    console.log("✅ SuperAdmin created successfully!");
    console.log(`   Name:  ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role:  ${superAdmin.role}`);
    console.log("─────────────────────────────────────────");
    console.log("👉 Now login with these credentials.");
    console.log("─────────────────────────────────────────");

    process.exit(0);
  } catch (err) {
    console.error(`❌ Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();