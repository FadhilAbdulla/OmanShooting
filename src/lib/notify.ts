// NOTIF-01/02 — provider adapters. MVP logs to console; plug in SMS / email / WhatsApp providers here.
export async function sendSms(mobile: string, text: string) {
  console.log(`[SMS → ${mobile}] ${text}`);
}

export async function sendEmail(to: string | null | undefined, subject: string, body: string) {
  if (!to) return;
  console.log(`[EMAIL → ${to}] ${subject}\n${body}`);
}
