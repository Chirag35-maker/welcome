import { authenticate } from "../shopify.server";
import crypto from 'crypto';

export const action = async ({ request }) => {
  try {
    // Get the raw body first
    const rawBody = await request.text();
    
    // Get all required headers
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");

    // Log headers for debugging
    console.log('Webhook Headers:', {
      hmac,
      topic,
      shop,
      hasSecret: !!process.env.SHOPIFY_API_SECRET
    });

    // Verify HMAC
    const hash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(rawBody)
      .digest("base64");

    // Log verification details
    console.log('HMAC Verification:', {
      received: hmac,
      calculated: hash,
      matches: hash === hmac
    });

    if (!hmac || hash !== hmac) {
      console.log('HMAC verification failed');
      return new Response('Invalid webhook signature', { status: 401 });
    }

    // Create a new request for authentication
    const authRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: rawBody
    });

    // Authenticate the webhook
    const { session } = await authenticate.webhook(authRequest);

    // Parse the body
    const body = JSON.parse(rawBody);

    // Handle GDPR webhooks first
    switch (topic) {
      case 'customers/data_request':
        console.log('Handling customers/data_request webhook');
        return new Response(null, { status: 200 });

      case 'customers/redact':
        console.log('Handling customers/redact webhook');
        return new Response(null, { status: 200 });

      case 'shop/redact':
        console.log('Handling shop/redact webhook');
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
        break;
      case "APP_PURCHASES_ONE_TIME_UPDATE":
        const purchase = body;
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}; 