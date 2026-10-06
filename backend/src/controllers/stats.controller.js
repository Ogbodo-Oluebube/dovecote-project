import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

export const getStats = asyncHandler(async (req, res) => {
  const match = req.user.role === "admin" ? {} : { userId: req.user._id };

  const rows = await Notification.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0 };
  rows.forEach((r) => (counts[r._id] = r.count));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const finished = counts.sent + counts.failed;
  const successRate = finished ? Math.round((counts.sent / finished) * 1000) / 10 : 0;

  ok(res, "Stats fetched", { ...counts, total, successRate });
});
