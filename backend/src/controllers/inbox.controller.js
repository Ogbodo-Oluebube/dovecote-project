import InboxMessage from "../models/InboxMessage.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const listInbox = asyncHandler(async (req, res) => {
  const mine = { recipientUserId: req.user._id };
  const [items, unread] = await Promise.all([
    InboxMessage.find(mine).sort({ createdAt: -1 }).limit(100),
    InboxMessage.countDocuments({ ...mine, isRead: false }),
  ]);
  ok(res, "Inbox fetched", { items, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const msg = await InboxMessage.findOneAndUpdate(
    { _id: req.params.id, recipientUserId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!msg) throw new ApiError(404, "Message not found");
  ok(res, "Marked as read", msg);
});
