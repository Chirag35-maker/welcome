import { authenticate } from "../shopify.server";
import { verifyShopifyWebhook } from "../utils/webhook-verification";

export const action = async ({ request }) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  // Get the raw body for HMAC verification
  const rawBody = await request.text();
  const hmac = request.headers.get('X-Shopify-Hmac-SHA256');

  // Verify the webhook signature
  if (!verifyShopifyWebhook(topic, hmac, JSON.parse(rawBody), rawBody)) {
    return new Response('Invalid webhook signature', { status: 401 });
  }

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
      const body = JSON.parse(rawBody);
      const subscription = body.app_subscription;
      // Handle subscription updates
      break;
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      const purchase = JSON.parse(rawBody);
      // Handle one-time purchase updates
      break;
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
}; 