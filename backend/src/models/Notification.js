import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, enum: ["email", "sms", "in_app"], required: true },
    recipient: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: "" },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "cancelled"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: { type: Date },
    lastError: { type: String },
    sentAt: { type: Date },
    scheduledFor: { type: Date },
    priority: { type: Number, default: 0, min: 0, max: 2 },
  },
  { timestamps: true }
);

// Matches the worker's "find the next due job" query
notificationSchema.index({ status: 1, nextAttemptAt: 1, priority: -1 });

export default mongoose.model("Notification", notificationSchema);
