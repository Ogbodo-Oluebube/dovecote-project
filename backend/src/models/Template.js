import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["email", "sms", "in_app"], required: true },
    subject: { type: String, trim: true, default: "" },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Template", templateSchema);
