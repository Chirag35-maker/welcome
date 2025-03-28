import { json } from "@remix-run/node";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    // Get the email from the request body
    const { email } = await request.json();

    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    // Save to your database
    await db.emailSubscriber.create({
      data: {
        email,
        createdAt: new Date(),
      },
    });

    return json({ 
      success: true, 
      message: "Email saved successfully"
    });

  } catch (error) {
    console.error("Error saving email:", error);
    return json({ 
      error: "Failed to save email",
      details: error.message 
    }, { status: 500 });
  }
}; 