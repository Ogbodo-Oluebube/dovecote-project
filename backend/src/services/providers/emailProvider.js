import nodemailer from "nodemailer";

let transporter;
const getTransporter = () =>
  (transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: { user: process.env.MAILTRAP_USER, pass: process.env.MAILTRAP_PASS },
  }));

export async function sendEmail(job) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || "Dovecote <no-reply@dovecote.app>",
    to: job.recipient,
    subject: job.subject,
    text: job.message,
  });
}
