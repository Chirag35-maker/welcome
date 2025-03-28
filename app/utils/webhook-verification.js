import crypto from 'crypto';

export function verifyShopifyWebhook(topic, hmac, body, rawBody) {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  return hash === hmac;
} 