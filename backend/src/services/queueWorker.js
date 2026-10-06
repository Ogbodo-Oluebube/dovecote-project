import Notification from "../models/Notification.js";
import DeliveryAttempt from "../models/DeliveryAttempt.js";
import { sendEmail } from "./providers/emailProvider.js";
import { sendSms } from "./providers/smsProvider.js";
import { sendInApp } from "./providers/inAppProvider.js";

const providers = { email: sendEmail, sms: sendSms, in_app: sendInApp };

const STUCK_AFTER_MS = 5 * 60 * 1000;
const DELIVERY_TIMEOUT_MS = 15000;
const MAX_PER_TICK = 10;

// Read at call time (not import time) so tests can change env vars on the fly
const baseDelay = () => Number(process.env.RETRY_BASE_DELAY_MS ?? 10000);

let timer = null;
let isRunning = false;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Delivery timed out")), ms)),
  ]);

// A notification stuck in "processing" (e.g. the server crashed mid-send)
// is returned to the queue instead of being lost forever.
export async function recoverStuckJobs() {
  await Notification.updateMany(
    { status: "processing", lockedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    { status: "pending" }
  );
}

// Atomically claims ONE due job (so two workers can never grab the same one),
// attempts delivery, and records what happened. Returns false when the
// queue has nothing left to do right now.
export async function processOne() {
  const job = await Notification.findOneAndUpdate(
    { status: "pending", nextAttemptAt: { $lte: new Date() } },
    { status: "processing", lockedAt: new Date(), $inc: { attempts: 1 } },
    { sort: { priority: -1, nextAttemptAt: 1 }, new: true }
  );
  if (!job) return false;

  const started = Date.now();
  try {
    await withTimeout(providers[job.channel](job), DELIVERY_TIMEOUT_MS);

    await DeliveryAttempt.create({
      notificationId: job._id,
      attemptNumber: job.attempts,
      status: "success",
      durationMs: Date.now() - started,
    });
    job.status = "sent";
    job.sentAt = new Date();
    job.lastError = undefined;
  } catch (err) {
    await DeliveryAttempt.create({
      notificationId: job._id,
      attemptNumber: job.attempts,
      status: "failed",
      error: err.message,
      durationMs: Date.now() - started,
    });
    job.lastError = err.message;

    if (job.attempts >= job.maxAttempts) {
      job.status = "failed"; // out of tries: needs a human to retry it
    } else {
      job.status = "pending"; // exponential backoff: 10s, 20s, 40s...
      job.nextAttemptAt = new Date(Date.now() + baseDelay() * 2 ** (job.attempts - 1));
    }
  }

  job.lockedAt = undefined;
  await job.save();
  return true;
}

// One tick of the worker. isRunning stops a slow tick from overlapping the next.
async function tick() {
  if (isRunning) return;
  isRunning = true;
  try {
    await recoverStuckJobs();
    for (let i = 0; i < MAX_PER_TICK; i++) {
      if (!(await processOne())) break; // queue is empty for now
    }
  } catch (err) {
    console.error("[worker] tick failed:", err.message);
  } finally {
    isRunning = false;
  }
}

export function startWorker() {
  const interval = Number(process.env.WORKER_INTERVAL_MS) || 3000;
  timer = setInterval(tick, interval);
  console.log(`Queue worker started (every ${interval}ms)`);
}

export function stopWorker() {
  clearInterval(timer);
}
