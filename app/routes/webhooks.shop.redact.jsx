import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle shop data erasure request
  if (topic === "SHOP_REDACT") {
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

      // Extract shop information from the payload
      const { shop_id, shop_domain } = payload;

      // Log the data that will be deleted for compliance
      const shopData = await prisma.shop.findUnique({
        where: { id: shop_id },
        include: {
          // Include all related data
          customers: true,
          orders: true,
          settings: true,
          // Add other relations as needed
        }
      });

      // Log the data that will be deleted
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify({
            shop_id,
            data_to_delete: shopData
          }),
          status: "processing"
        }
      });

      // Delete all shop data
      // Delete related data first
      await prisma.customer.deleteMany({
        where: { shopId: shop_id }
      });

      await prisma.order.deleteMany({
        where: { shopId: shop_id }
      });

      await prisma.shopSetting.deleteMany({
        where: { shopId: shop_id }
      });

      // Finally, delete the shop record
      await prisma.shop.delete({
        where: { id: shop_id }
      });

      // Log the successful deletion
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify({
            shop_id,
            status: "deleted"
          }),
          status: "completed"
        }
      });

      console.log("Shop data deleted successfully");

    } catch (error) {
      console.error("Error processing shop data erasure:", error);
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