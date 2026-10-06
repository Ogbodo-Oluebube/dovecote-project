import { MailtrapClient } from 'mailtrap';

const getClient = () => {
  const token = process.env.MAILTRAP_TOKEN;
  if (!token) {
    throw new Error('MAILTRAP_TOKEN is not set');
  }

  return new MailtrapClient({
    token,
    endpoint: process.env.MAILTRAP_API_ENDPOINT,
  });
};

const getSender = () => ({
  email:
    process.env.MAILTRAP_SENDER_EMAIL ||
    process.env.MAIL_FROM ||
    'hello@demomailtrap.co',
  name: process.env.MAILTRAP_SENDER_NAME || 'Dovecote',
});

export async function sendEmail(job) {
  if (!job?.recipient) {
    throw new Error('Email recipient is required');
  }

  const client = getClient();

  return client.send({
    from: getSender(),
    to: [{ email: job.recipient }],
    subject: job.subject || 'Dovecote Notification',
    text: job.message,
    category: 'dovecote-notification',
  });
}
