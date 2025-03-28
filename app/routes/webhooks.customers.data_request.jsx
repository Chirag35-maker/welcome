import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle customer data request
  if (topic === "CUSTOMERS_DATA_REQUEST") {
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

      // Gather all customer data from your database
      const customerData = await prisma.customer.findMany({
        where: {
          shopId: shop_id,
          customerId: {
            in: customer_ids
          }
        },
        include: {
          // Include any related data you store about customers
          orders: true,
          settings: true,
          // Add other relations as needed
        }
      });

      // Format the data according to Shopify's requirements
      const formattedData = {
        customer_id: customer_ids[0], // The webhook contains the customer ID
        shop_id,
        shop_domain,
        data: {
          // Include all customer data you store
          customer: customerData,
          orders: customerData.flatMap(c => c.orders),
          settings: customerData.map(c => c.settings),
          // Add other data types as needed
        }
      };

      // Log the data being sent
      await prisma.webhookLog.create({
        data: {
          shop,
          topic,
          payload: JSON.stringify(formattedData),
          status: "processed"
        }
      });

      // Here you would typically send the data to Shopify
      // This is usually done through their API or a secure data transfer method
      console.log("Customer data prepared for Shopify:", formattedData);

    } catch (error) {
      console.error("Error processing customer data request:", error);
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