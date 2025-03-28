import { authenticate } from "../shopify.server";
import { verifyShopifyWebhook } from "../utils/webhook-verification";

export const action = async ({ request }) => {
  // Get the raw body first, before any parsing
  const rawBody = await request.text();
  
  // Clone the request for authentication
  const clonedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody
  });

  const { topic, shop, session } = await authenticate.webhook(clonedRequest);
  const hmac = request.headers.get('X-Shopify-Hmac-SHA256');

  // Verify the webhook signature using raw body
  if (!verifyShopifyWebhook(topic, hmac, rawBody)) {
    return new Response('Invalid webhook signature', { status: 401 });
  }

  // Parse the body only after verification
  const body = JSON.parse(rawBody);

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