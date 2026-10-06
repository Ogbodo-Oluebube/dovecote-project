import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification", required: true, index: true },
    attemptNumber: { type: Number, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    error: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryAttempt", attemptSchema);
