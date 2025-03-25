import { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Select,
  Tag,
  TextField,
  Banner,
  ButtonGroup,
  Icon,
  Tooltip,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Fetch existing metafields for welcome popup settings
  const response = await admin.graphql(
    `#graphql
      query getWelcomePopupMetafields {
        shop {
          metafields(first: 50, namespace: "welcome") {
            edges {
              node {
                id
                key
                value
                type
              }
            }
          }
        }
      }
    `
  );
  
  const responseJson = await response.json();
  return responseJson.data.shop.metafields;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "savePopupSettings") {
    // Get all settings directly from the form data
    const settings = {
      title: formData.get("title"),
      description: formData.get("description"),
      buttonText: formData.get("buttonText"),
      buttonLink: formData.get("buttonLink"),
      countryCode: formData.get("countryCode")
    };

    // Create or update metafield
    const response = await admin.graphql(
      `#graphql
        mutation createMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
              type
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
            key: "selected-welcome",
            value: JSON.stringify(settings),
            type: "json",
            ownerId: "gid://shopify/Shop/1",
          }],
        },
      }
    );
    
    const responseJson = await response.json();
    return responseJson.data.metafieldsSet;
  }

  if (action === "saveSelectedCountries") {
    const selectedCountries = JSON.parse(formData.get("selectedCountries"));
    
    // Create or update metafield for selected countries
    const response = await admin.graphql(
      `#graphql
        mutation createMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
              type
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
            key: "selected-countries",
            value: JSON.stringify(selectedCountries),
            type: "json",
            ownerId: "gid://shopify/Shop/1",
          }],
        },
      }
    );
    
    const responseJson = await response.json();
    return responseJson.data.metafieldsSet;
  }

  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const [selectedCountries, setSelectedCountries] = useState(['US']);
  const [currentSelection, setCurrentSelection] = useState('');
  const [popupSettings, setPopupSettings] = useState({});
  const [showCodeSnippet, setShowCodeSnippet] = useState({});
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading = ["loading", "submitting"].includes(fetcher.state);
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  const countries = [
    { label: 'United States', value: 'US' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'Australia', value: 'AU' },
    { label: 'Germany', value: 'DE' },
    { label: 'France', value: 'FR' },
    { label: 'Japan', value: 'JP' },
    { label: 'India', value: 'IN' },
  ];

  // Load existing metafields when component mounts
  useEffect(() => {
    const loadMetafields = async () => {
      const response = await fetch('/app');
      const metafields = await response.json();
      
      // Initialize popup settings and selected countries from metafields
      const settings = {};
      let savedCountries = ['US']; // Default to US if no saved countries
      
      metafields.edges.forEach(({ node }) => {
        if (node.key === 'selected-welcome') {
          try {
            const parsedValue = JSON.parse(node.value);
            settings[parsedValue.countryCode] = parsedValue;
          } catch (e) {
            console.error('Error parsing metafield value:', e);
          }
        }
        if (node.key === 'selected-countries') {
          try {
            savedCountries = JSON.parse(node.value);
          } catch (e) {
            console.error('Error parsing selected countries:', e);
          }
        }
      });
      
      setPopupSettings(settings);
      setSelectedCountries(savedCountries);
    };
    
    loadMetafields();
  }, []);

  // Save selected countries when they change
  useEffect(() => {
    const saveCountries = async () => {
      const formData = new FormData();
      formData.append("action", "saveSelectedCountries");
      formData.append("selectedCountries", JSON.stringify(selectedCountries));
      fetcher.submit(formData, { method: "POST" });
    };
    
    saveCountries();
  }, [selectedCountries]);

  const handleCountryChange = (value) => {
    setCurrentSelection(value);
    if (value && !selectedCountries.includes(value)) {
      setSelectedCountries([...selectedCountries, value]);
    }
  };

  const removeCountry = (countryCode) => {
    setSelectedCountries(selectedCountries.filter(code => code !== countryCode));
  };

  const handlePopupSettingChange = (countryCode, field, value) => {
    setPopupSettings(prev => ({
      ...prev,
      [countryCode]: {
        ...prev[countryCode],
        [field]: value
      }
    }));
  };

  const savePopupSettings = (countryCode) => {
    const settings = popupSettings[countryCode];
    if (!settings) return;

    const formData = new FormData();
    formData.append("action", "savePopupSettings");
    formData.append("countryCode", countryCode);
    formData.append("title", settings.title || "");
    formData.append("description", settings.description || "");
    formData.append("buttonText", settings.buttonText || "");
    formData.append("buttonLink", settings.buttonLink || "");

    fetcher.submit(formData, { method: "POST" });
  };

  const getCodeSnippet = (countryCode) => {
    return `
<script>
  (function() {
    // Load the welcome popup app
    const script = document.createElement('script');
    script.src = '/apps/welcome-popup/embed.js';
    script.setAttribute('data-country', '${countryCode}');
    // The metafield will be accessed server-side in the embed.js
    document.head.appendChild(script);
  })();
</script>`;
  };

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <Page>
      <TitleBar title="Welcome Popup Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Country Selector
              </Text>
              <Select
                label="Select a country"
                options={countries}
                onChange={handleCountryChange}
                value={currentSelection}
              />
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  Selected countries:
                </Text>
                <InlineStack gap="200" wrap>
                  {selectedCountries.map(countryCode => (
                    <Tag key={countryCode} onRemove={() => removeCountry(countryCode)}>
                      {countries.find(c => c.value === countryCode)?.label}
                    </Tag>
                  ))}
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <BlockStack gap="500">
            {selectedCountries.map(countryCode => (
              <Card key={countryCode}>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">
                      {countries.find(c => c.value === countryCode)?.label}
                    </Text>
                    <Tag onRemove={() => removeCountry(countryCode)}>Remove</Tag>
                  </InlineStack>
                  
                  <BlockStack gap="400">
                    <Text as="h4" variant="headingSm">Popup Settings</Text>
                    <TextField
                      label="Popup Title"
                      value={popupSettings[countryCode]?.title || ''}
                      onChange={(value) => handlePopupSettingChange(countryCode, 'title', value)}
                    />
                    <TextField
                      label="Popup Description"
                      multiline={4}
                      value={popupSettings[countryCode]?.description || ''}
                      onChange={(value) => handlePopupSettingChange(countryCode, 'description', value)}
                    />
                    <TextField
                      label="Button Text"
                      value={popupSettings[countryCode]?.buttonText || ''}
                      onChange={(value) => handlePopupSettingChange(countryCode, 'buttonText', value)}
                    />
                    <TextField
                      label="Button Link"
                      value={popupSettings[countryCode]?.buttonLink || ''}
                      onChange={(value) => handlePopupSettingChange(countryCode, 'buttonLink', value)}
                    />
                    <Button onClick={() => savePopupSettings(countryCode)}>
                      Save Settings
                    </Button>
                  </BlockStack>

                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="h4" variant="headingSm">Implementation</Text>
                      <Button onClick={() => setShowCodeSnippet(prev => ({ ...prev, [countryCode]: !prev[countryCode] }))}>
                        {showCodeSnippet[countryCode] ? 'Hide Code' : 'Show Code'}
                      </Button>
                    </InlineStack>
                    
                    {showCodeSnippet[countryCode] && (
                      <Box
                        padding="400"
                        background="bg-surface-active"
                        borderWidth="025"
                        borderRadius="200"
                        borderColor="border"
                        overflowX="scroll"
                      >
                        <pre style={{ margin: 0 }}>
                          <code>{getCodeSnippet(countryCode)}</code>
                        </pre>
                      </Box>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Congrats on creating a new Shopify app 🎉
                </Text>
                <Text variant="bodyMd" as="p">
                  This embedded app template uses{" "}
                  <Link
                    url="https://shopify.dev/docs/apps/tools/app-bridge"
                    target="_blank"
                    removeUnderline
                  >
                    App Bridge
                  </Link>{" "}
                  interface examples like an{" "}
                  <Link url="/app/additional" removeUnderline>
                    additional page in the app nav
                  </Link>
                  , as well as an{" "}
                  <Link
                    url="https://shopify.dev/docs/api/admin-graphql"
                    target="_blank"
                    removeUnderline
                  >
                    Admin GraphQL
                  </Link>{" "}
                  mutation demo, to provide a starting point for app
                  development.
                </Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Get started with products
                </Text>
                <Text as="p" variant="bodyMd">
                  Generate a product with GraphQL and get the JSON output for
                  that product. Learn more about the{" "}
                  <Link
                    url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                    target="_blank"
                    removeUnderline
                  >
                    productCreate
                  </Link>{" "}
                  mutation in our API references.
                </Text>
              </BlockStack>
              <InlineStack gap="300">
                <Button loading={isLoading} onClick={generateProduct}>
                  Generate a product
                </Button>
                {fetcher.data?.product && (
                  <Button
                    url={`shopify:admin/products/${productId}`}
                    target="_blank"
                    variant="plain"
                  >
                    View product
                  </Button>
                )}
              </InlineStack>
              {fetcher.data?.product && (
                <>
                  <Text as="h3" variant="headingMd">
                    {" "}
                    productCreate mutation
                  </Text>
                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0 }}>
                      <code>
                        {JSON.stringify(fetcher.data.product, null, 2)}
                      </code>
                    </pre>
                  </Box>
                  <Text as="h3" variant="headingMd">
                    {" "}
                    productVariantsBulkUpdate mutation
                  </Text>
                  <Box
                    padding="400"
                    background="bg-surface-active"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0 }}>
                      <code>
                        {JSON.stringify(fetcher.data.variant, null, 2)}
                      </code>
                    </pre>
                  </Box>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  App template specs
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Framework
                    </Text>
                    <Link
                      url="https://remix.run"
                      target="_blank"
                      removeUnderline
                    >
                      Remix
                    </Link>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Database
                    </Text>
                    <Link
                      url="https://www.prisma.io/"
                      target="_blank"
                      removeUnderline
                    >
                      Prisma
                    </Link>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Interface
                    </Text>
                    <span>
                      <Link
                        url="https://polaris.shopify.com"
                        target="_blank"
                        removeUnderline
                      >
                        Polaris
                      </Link>
                      {", "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/app-bridge"
                        target="_blank"
                        removeUnderline
                      >
                        App Bridge
                      </Link>
                    </span>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      API
                    </Text>
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      GraphQL API
                    </Link>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Next steps
                </Text>
                <List>
                  <List.Item>
                    Build an{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                      target="_blank"
                      removeUnderline
                    >
                      {" "}
                      example app
                    </Link>{" "}
                    to get started
                  </List.Item>
                  <List.Item>
                    Explore Shopify's API with{" "}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                      target="_blank"
                      removeUnderline
                    >
                      GraphiQL
                    </Link>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
