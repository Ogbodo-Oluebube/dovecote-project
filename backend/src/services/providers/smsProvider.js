// Simulated SMS carrier. Real SMS costs money and isn't needed for the MVP;
// this fails at a configurable rate so retries are easy to see in a demo.
const ERRORS = ["Carrier timeout", "Number unreachable", "Gateway rate limited"];

export async function sendSms(job) {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));

  const rate = Number(process.env.SMS_FAILURE_RATE ?? 0.3);
  if (Math.random() < rate) {
    throw new Error(ERRORS[Math.floor(Math.random() * ERRORS.length)]);
  }
}
