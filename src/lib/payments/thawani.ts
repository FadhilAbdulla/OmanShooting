/**
 * Thawani checkout (PAY-01). Uses the real API when THAWANI_SECRET_KEY is set; otherwise the
 * built-in mock gateway at /pay/mock/[orderId] so the full flow works offline.
 * Amounts are in baisa (1 OMR = 1000 baisa).
 */
import { isDemo } from "../utils";

const base = process.env.THAWANI_BASE_URL || "https://uatcheckout.thawani.om";
const app = process.env.APP_URL || "http://localhost:3000";

export const thawaniEnabled = () => !!process.env.THAWANI_SECRET_KEY;

export async function createCheckout(order: { id: string; ref: string; total: number; customerId: string }) {
  if (!thawaniEnabled()) {
    if (!isDemo()) throw new Error("Card payments are not configured (set THAWANI_SECRET_KEY)");
    return { url: `/pay/mock/${order.id}`, sessionId: `mock_${order.id}` };
  }
  const res = await fetch(`${base}/api/v1/checkout/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "thawani-api-key": process.env.THAWANI_SECRET_KEY! },
    body: JSON.stringify({
      client_reference_id: order.ref,
      mode: "payment",
      products: [{ name: `Booking ${order.ref}`, quantity: 1, unit_amount: Math.round(order.total * 1000) }],
      success_url: `${app}/api/payments/thawani/return?order=${order.id}`,
      cancel_url: `${app}/api/payments/thawani/return?order=${order.id}&cancel=1`,
      metadata: { orderId: order.id, customerId: order.customerId },
    }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error(`Thawani error: ${json?.description ?? res.status}`);
  const sessionId = json.data.session_id as string;
  return { url: `${base}/pay/${sessionId}?key=${process.env.THAWANI_PUBLISHABLE_KEY}`, sessionId };
}

/** URL to resume an unfinished checkout session. */
export function checkoutUrl(sessionId: string, orderId: string) {
  return sessionId.startsWith("mock_") ? `/pay/mock/${orderId}` : `${base}/pay/${sessionId}?key=${process.env.THAWANI_PUBLISHABLE_KEY}`;
}

/** Never trust the redirect alone — always ask Thawani for the session status. */
export async function isPaid(sessionId: string) {
  if (sessionId.startsWith("mock_")) return isDemo() && !thawaniEnabled();
  const res = await fetch(`${base}/api/v1/checkout/session/${sessionId}`, {
    headers: { "thawani-api-key": process.env.THAWANI_SECRET_KEY! },
  });
  const json = await res.json();
  return json?.data?.payment_status === "paid";
}
