import Notification from "../models/Notification.js";
import DeliveryAttempt from "../models/DeliveryAttempt.js";
import Template from "../models/Template.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { renderTemplate } from "../utils/renderTemplate.js";

const isAdmin = (req) => req.user.role === "admin";
const str = (v) => (typeof v === "string" ? v : ""); // blocks NoSQL injection like ?status[$ne]=x
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Fetch a notification the current user is allowed to see (owner or admin)
async function findAccessible(req) {
  const n = await Notification.findById(req.params.id);
  if (!n || (!isAdmin(req) && !n.userId.equals(req.user._id))) {
    throw new ApiError(404, "Notification not found");
  }
  return n;
}

export const createNotification = asyncHandler(async (req, res) => {
  const { channel, recipient, scheduledFor, priority, templateId, variables } = req.body;
  let { subject, message } = req.body;

  if (templateId) {
    const tpl = await Template.findOne({ _id: templateId, userId: req.user._id });
    if (!tpl) throw new ApiError(404, "Template not found");
    if (tpl.channel !== channel) throw new ApiError(400, "Template channel does not match");
    subject = renderTemplate(tpl.subject, variables);
    message = renderTemplate(tpl.body, variables);
  }

  const when = scheduledFor ? new Date(scheduledFor) : new Date();

  // Save and respond immediately. Nothing is sent here: this IS the "queue" moment.
  const notification = await Notification.create({
    userId: req.user._id,
    channel,
    recipient,
    subject,
    message,
    scheduledFor: scheduledFor ? when : undefined,
    nextAttemptAt: when,
    priority,
  });
  ok(res, "Notification queued", notification, 201);
});

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = isAdmin(req) ? {} : { userId: req.user._id };
  const status = str(req.query.status);
  const channel = str(req.query.channel);
  const search = str(req.query.search).trim();

  if (status) filter.status = status;
  if (channel) filter.channel = channel;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ recipient: rx }, { subject: rx }];
  }

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
  ]);

  ok(res, "Notifications fetched", {
    items, page, limit, total, totalPages: Math.ceil(total / limit),
  });
});

export const getNotification = asyncHandler(async (req, res) => {
  ok(res, "Notification fetched", await findAccessible(req));
});

export const getAttempts = asyncHandler(async (req, res) => {
  const n = await findAccessible(req);
  const attempts = await DeliveryAttempt.find({ notificationId: n._id }).sort({ attemptNumber: 1 });
  ok(res, "Delivery attempts fetched", attempts);
});

export const cancelNotification = asyncHandler(async (req, res) => {
  const n = await findAccessible(req);
  // Atomic: if the worker claimed it a moment ago, this matches nothing
  const updated = await Notification.findOneAndUpdate(
    { _id: n._id, status: "pending" },
    { status: "cancelled" },
    { new: true }
  );
  if (!updated) throw new ApiError(409, "Only pending notifications can be cancelled");
  ok(res, "Notification cancelled", updated);
});

export const retryNotification = asyncHandler(async (req, res) => {
  const n = await findAccessible(req);
  // Give it 3 more tries; attempt numbers keep counting up (no duplicate "Attempt 1")
  const updated = await Notification.findOneAndUpdate(
    { _id: n._id, status: "failed" },
    { status: "pending", nextAttemptAt: new Date(), $inc: { maxAttempts: 3 } },
    { new: true }
  );
  if (!updated) throw new ApiError(409, "Only failed notifications can be retried");
  ok(res, "Notification re-queued", updated);
});
