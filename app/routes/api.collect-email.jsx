import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { db } from "~/db.server";

export const action = async ({ request }) => {
  try {
    // Authenticate the request
    const { admin, session } = await authenticate.admin(request);

    // Get the email from the request body
    const { email } = await request.json();

    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    // Save to your database
    await db.emailSubscriber.create({
      data: {
        email,
        shop: session.shop,
        createdAt: new Date(),
      },
    });

    // Create a customer in Shopify
    const customerData = {
      customer: {
        email: email,
        verified_email: false,
        accepts_marketing: true,
        tags: "newsletter_subscriber",
      },
    };

    const response = await admin.rest.resources.Customer.create({
      data: customerData,
    });

    return json({ 
      success: true, 
      message: "Email collected and saved successfully",
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