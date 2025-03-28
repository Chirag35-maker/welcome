import { authenticate } from "../shopify.server";
import crypto from 'crypto';

export const action = async ({ request }) => {
  // Clone the request before authentication consumes the body
  const reqClone = request.clone();
  const rawPayload = await reqClone.text();

  // Get the HMAC signature from headers
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  // Verify the webhook signature
  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawPayload)
    .digest("base64");

  if (hash !== hmac) {
    return new Response('Invalid webhook signature', { status: 401 });
  }

  // Now authenticate the webhook
  const { session } = await authenticate.webhook(request);

  // Parse the body only after verification
  const body = JSON.parse(rawPayload);

  // Handle compliance webhooks
  if (topic === 'customers/data_request') {
    // Handle data request
    return new Response(null, { status: 200 });
  }

  if (topic === 'customers/redact') {
    // Handle customer data redaction
    return new Response(null, { status: 200 });
  }

  if (topic === 'shop/redact') {
    // Handle shop data redaction
    return new Response(null, { status: 200 });
  }

  // Handle other webhooks
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;
    case "APP_SUBSCRIPTIONS_UPDATE":
      const subscription = body.app_subscription;
      // Handle subscription updates
      break;
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      const purchase = body;
      // Handle one-time purchase updates
      break;
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
}; 