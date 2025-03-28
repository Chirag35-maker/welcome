import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    // Get the request body
    const { email } = await request.json();

    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    // Authenticate and get the session
    const { admin, session } = await authenticate.admin(request);

    // First save to our database
    const subscriber = await db.subscriber.create({
      data: {
        email,
        shopId: session.shop,
        status: 'active'
      }
    });

    // Then create a customer in Shopify
    const customerData = {
      customer: {
        email: email,
        verified_email: false,
        accepts_marketing: true,
        tags: "welcome_popup_subscriber",
      },
    };

    const response = await admin.rest.resources.Customer.create({
      data: customerData,
    });

    return json({ 
      success: true, 
      message: "Email collected and saved successfully",
      subscriber,
      customer: response.data
    });

  } catch (error) {
    console.error("Error collecting email:", error);
    return json({ 
      error: "Failed to process email collection",
      details: error.message 
    }, { status: 500 });
  }
}; 