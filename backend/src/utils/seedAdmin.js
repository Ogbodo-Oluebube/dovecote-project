// Run with: npm run seed:admin
// Creates the admin account from .env, or promotes it if it already exists.
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const { ADMIN_NAME = "Admin", ADMIN_EMAIL, ADMIN_PASSWORD, MONGO_URI } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

const email = ADMIN_EMAIL.toLowerCase();
const existing = await User.findOne({ email });

if (existing) {
  existing.role = "admin";
  await existing.save();
  console.log("Existing user promoted to admin:", email);
} else {
  await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: "admin" });
  console.log("Admin account created:", email);
}

await mongoose.disconnect();
