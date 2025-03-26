import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Select,
  InlineStack,
  Button,
  Tag,
  Banner,
  Spinner,
  LegacyCard,
  TextField,
  Modal,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const response = await admin.graphql(
      `#graphql
        query {
          shop {
            id
            metafield(namespace: "welcome", key: "selected-countrywelcome") {
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
    
    return json({
      countrySettings: metafield ? JSON.parse(metafield.value) : {}
    });
  } catch (error) {
    console.error("Error loading metafields:", error);
    return json({ countrySettings: {} });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const countrySettings = formData.get("countrySettings");

  try {
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
            namespace: "welcome",
            key: "selected-countrywelcome",
            value: countrySettings,
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

export default function Index() {
  const { countrySettings } = useLoaderData();
  const [selectedCountries, setSelectedCountries] = useState(Object.keys(countrySettings));
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    heading: "",
    subheading: "",
    discountCode: "",
  });
  const submit = useSubmit();
  const app = useAppBridge();

  const countries = [
    { label: "Antigua and Barbuda", value: "AG" },
    { label: "El Salvador", value: "SV" },
    { label: "Liberia", value: "LR" },
    { label: "Fiji", value: "FJ" },
    { label: "Jamaica", value: "JM" },
    { label: "Cameroon", value: "CM" },
    { label: "Afghanistan", value: "AF" },
    { label: "Benin", value: "BJ" }
  ];

  const handleCountrySelect = (value) => {
    if (!selectedCountries.includes(value)) {
      setSelectedCountries([...selectedCountries, value]);
      // Initialize empty settings for new country
      const newSettings = {
        ...countrySettings,
        [value]: {
          heading: "",
          subheading: "",
          discountCode: ""
        }
      };
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("countrySettings", JSON.stringify(newSettings));
      submit(formDataToSubmit, { method: "post" });
    }
  };

  const handleCountryRemove = (countryToRemove) => {
    setSelectedCountries(selectedCountries.filter((country) => country !== countryToRemove));
    // Remove country settings
    const newSettings = { ...countrySettings };
    delete newSettings[countryToRemove];
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("countrySettings", JSON.stringify(newSettings));
    submit(formDataToSubmit, { method: "post" });
  };

  const handleClearAll = () => {
    setSelectedCountries([]);
    // Clear all settings
    const formDataToSubmit = new FormData();
    formDataToSubmit.append("countrySettings", JSON.stringify({}));
    submit(formDataToSubmit, { method: "post" });
  };

  const handleEditCountry = (country) => {
    setEditingCountry(country);
    setFormData(countrySettings[country] || {
      heading: "",
      subheading: "",
      discountCode: "",
    });
    setIsModalOpen(true);
  };

  const handleSaveWelcomeContent = async () => {
    try {
      setIsLoading(true);
      const newSettings = {
        ...countrySettings,
        [editingCountry]: {
          heading: formData.heading,
          subheading: formData.subheading,
          discountCode: formData.discountCode
        }
      };
      
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("countrySettings", JSON.stringify(newSettings));
      
      await submit(formDataToSubmit, { method: "post" });
      setIsModalOpen(false);
      setEditingCountry(null);
    } catch (err) {
      setError("Failed to save content");
      console.error("Error saving content:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCountry(null);
  };

  return (
    <Page>
      <TitleBar title="Country Selector" />
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <BlockStack gap="4">
              <Text as="h2" variant="headingMd">
                Select Countries
              </Text>
              <InlineStack gap="4" align="start">
                <Select
                  label="Add Country"
                  options={countries}
                  onChange={handleCountrySelect}
                  value=""
                  disabled={isLoading}
                />
                {selectedCountries.length > 0 && (
                  <Button onClick={handleClearAll} destructive>
                    Clear All
                  </Button>
                )}
              </InlineStack>

              {error && (
                <Banner status="critical">
                  <p>{error}</p>
                </Banner>
              )}

              <InlineStack gap="2" wrap>
                {selectedCountries.map((country) => (
                  <Tag key={country} onRemove={() => handleCountryRemove(country)}>
                    {countries.find((c) => c.value === country)?.label || country}
                  </Tag>
                ))}
              </InlineStack>
            </BlockStack>
          </LegacyCard>

          {selectedCountries.length > 0 && (
            <BlockStack gap="4" style={{ marginTop: "2rem" }}>
              <Text as="h2" variant="headingMd">
                Welcome Pop-up Content
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                {selectedCountries.map((country) => (
                  <Card key={country}>
                    <BlockStack gap="4" padding="4">
                      <InlineStack align="space-between">
                        <Text as="h3" variant="headingSm">
                          {countries.find((c) => c.value === country)?.label || country}
                        </Text>
                        <Button onClick={() => handleEditCountry(country)}>Edit</Button>
                      </InlineStack>
                      {countrySettings[country] && (
                        <>
                          <BlockStack gap="2">
                            <Text as="p" variant="headingSm">Heading:</Text>
                            <Text as="p" variant="bodyMd" style={{ whiteSpace: 'pre-wrap' }}>
                              {countrySettings[country].heading || "No heading set"}
                            </Text>
                          </BlockStack>
                          <BlockStack gap="2">
                            <Text as="p" variant="headingSm">Subheading:</Text>
                            <Text as="p" variant="bodyMd" style={{ whiteSpace: 'pre-wrap' }}>
                              {countrySettings[country].subheading || "No subheading set"}
                            </Text>
                          </BlockStack>
                          <BlockStack gap="2">
                            <Text as="p" variant="headingSm">Discount Code:</Text>
                            <Text as="p" variant="bodyMd" style={{ whiteSpace: 'pre-wrap' }}>
                              {countrySettings[country].discountCode || "No discount code set"}
                            </Text>
                          </BlockStack>
                        </>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        title={`Edit Welcome Content for ${editingCountry ? countries.find((c) => c.value === editingCountry)?.label : ""}`}
        primaryAction={{
          content: "Save",
          onAction: handleSaveWelcomeContent,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="4">
            <TextField
              label="Heading"
              value={formData.heading}
              onChange={(value) => setFormData({ ...formData, heading: value })}
              placeholder="Enter heading for this country..."
              multiline={4}
            />
            <TextField
              label="Subheading"
              value={formData.subheading}
              onChange={(value) => setFormData({ ...formData, subheading: value })}
              placeholder="Enter subheading for this country..."
              multiline={4}
            />
            <TextField
              label="Discount Code"
              value={formData.discountCode}
              onChange={(value) => setFormData({ ...formData, discountCode: value })}
              placeholder="Enter discount code for this country..."
              multiline={4}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
