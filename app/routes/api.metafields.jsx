import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get the shop's metafield for allowed countries
    const response = await admin.graphql(
      `#graphql
        query {
          shop {
            id
            metafield(namespace: "country_selector", key: "allowed_countries") {
              id
              value
            }
          }
        }
      `
    );

    const responseJson = await response.json();
    const shop = responseJson.data.shop;
    const metafield = shop.metafield;
    
    if (!metafield) {
      // If no metafield exists, create one with empty array
      const createResponse = await admin.graphql(
        `#graphql
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            metafields: [{
              namespace: "country_selector",
              key: "allowed_countries",
              value: "[]",
              type: "json",
              ownerId: shop.id
            }]
          }
        }
      );

      const createResponseJson = await createResponse.json();
      if (createResponseJson.data.metafieldsSet.userErrors.length > 0) {
        throw new Error(createResponseJson.data.metafieldsSet.userErrors[0].message);
      }
      return json({ allowedCountries: [] });
    }

    return json({ allowedCountries: JSON.parse(metafield.value) });
  } catch (error) {
    console.error("Error loading metafields:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // First get the shop ID
    const shopResponse = await admin.graphql(
      `#graphql
        query {
          shop {
            id
          }
        }
      `
    );

    const shopResponseJson = await shopResponse.json();
    const shopId = shopResponseJson.data.shop.id;

    const formData = await request.formData();
    const countries = formData.get("countries");

    const response = await admin.graphql(
      `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: [{
            namespace: "country_selector",
            key: "allowed_countries",
            value: countries,
            type: "json",
            ownerId: shopId
          }]
        }
      }
    );

    const responseJson = await response.json();
    if (responseJson.data.metafieldsSet.userErrors.length > 0) {
      throw new Error(responseJson.data.metafieldsSet.userErrors[0].message);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error updating metafields:", error);
    return json({ error: error.message }, { status: 500 });
  }
}; 