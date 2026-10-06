import User from "../../models/User.js";
import InboxMessage from "../../models/InboxMessage.js";

export async function sendInApp(job) {
  const user = await User.findOne({ email: job.recipient.toLowerCase() });
  if (!user) throw new Error("Recipient is not a registered user");

  await InboxMessage.create({
    recipientUserId: user._id,
    title: job.subject || "New notification",
    body: job.message,
  });
}
