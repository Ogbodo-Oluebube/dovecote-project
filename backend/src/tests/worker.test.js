import "dotenv/config";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import DeliveryAttempt from "../models/DeliveryAttempt.js";
import { processOne } from "../services/queueWorker.js";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await Notification.deleteMany({});
  await DeliveryAttempt.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

const make = (overrides = {}) =>
  Notification.create({
    userId: new mongoose.Types.ObjectId(),
    channel: "sms",
    recipient: "+2348012345678",
    message: "hello",
    ...overrides,
  });

test("a failing delivery is retried, then marked failed after maxAttempts", async () => {
  process.env.SMS_FAILURE_RATE = "1"; // always fail
  process.env.RETRY_BASE_DELAY_MS = "0"; // don't wait between retries, for a fast test
  const n = await make({ maxAttempts: 3 });

  await processOne();
  expect((await Notification.findById(n._id)).status).toBe("pending"); // will retry

  await processOne();
  await processOne();

  const done = await Notification.findById(n._id);
  expect(done.status).toBe("failed");
  expect(done.attempts).toBe(3);
  expect(await DeliveryAttempt.countDocuments({ notificationId: n._id })).toBe(3);
});

test("a working delivery is marked sent on the first attempt", async () => {
  process.env.SMS_FAILURE_RATE = "0"; // never fail
  const n = await make();

  await processOne();

  const done = await Notification.findById(n._id);
  expect(done.status).toBe("sent");
  expect(done.attempts).toBe(1);
  expect(done.sentAt).toBeTruthy();
});

test("a scheduled future notification is not picked up early", async () => {
  const n = await make({ nextAttemptAt: new Date(Date.now() + 60_000) });

  const handled = await processOne();

  expect(handled).toBe(false);
  expect((await Notification.findById(n._id)).status).toBe("pending");
});

test("processOne returns false when the queue is empty", async () => {
  await Notification.deleteMany({});
  expect(await processOne()).toBe(false);
});
