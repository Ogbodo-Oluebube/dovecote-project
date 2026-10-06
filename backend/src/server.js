import "dotenv/config"; // MUST be the first import: other modules read process.env at import time
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { startWorker, stopWorker } from "./services/queueWorker.js";

const port = process.env.PORT || 5000;

await connectDB(process.env.MONGO_URI);
startWorker();
const server = app.listen(port, () => console.log(`Dovecote running on http://localhost:${port}`));

// Hosts like Render send SIGTERM before restarting or redeploying a service.
// Stop taking new jobs and close connections cleanly instead of dying mid-delivery.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  stopWorker();
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  // Force-exit if something hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
