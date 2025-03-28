import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle customer data erasure request
  if (topic === "CUSTOMERS_REDACT") {
    try {
      // Log the request for compliance
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify(payload),
          status: "received"
        }
      });

      // Extract customer IDs from the payload
      const { customer_ids, shop_id, shop_domain } = payload;

      // Delete or anonymize customer data from your database
      // First, log the data that will be deleted for compliance
      const customerData = await prisma.customer.findMany({
        where: {
          shopId: shop_id,
          customerId: {
            in: customer_ids
          }
        }
      });

      // Log the data that will be deleted
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify({
            customer_ids,
            data_to_delete: customerData
          }),
          status: "processing"
        }
      });

      // Delete the customer data
      await prisma.customer.deleteMany({
        where: {
          shopId: shop_id,
          customerId: {
            in: customer_ids
          }
        }
      });

      // Log the successful deletion
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify({
            customer_ids,
            status: "deleted"
          }),
          status: "completed"
        }
      });

      console.log("Customer data deleted successfully");

    } catch (error) {
      console.error("Error processing customer data erasure:", error);
      // Log the error
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify({ error: error.message }),
          status: "error"
        }
      });
    }
  }

  return new Response(null, { status: 200 });
}; 