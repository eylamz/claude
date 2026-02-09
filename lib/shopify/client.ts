/**
 * Shopify Storefront API Client
 * 
 * Handles GraphQL requests to Shopify Storefront API with retry logic,
 * checkout operations, product sync, and webhook verification.
 */

import crypto from 'node:crypto';

interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion?: string;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: any;
  }>;
  extensions?: any;
}

interface CheckoutLineItem {
  variantId: string;
  quantity: number;
  customAttributes?: Array<{ key: string; value: string }>;
}

interface CheckoutCustomer {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface ShippingAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface CheckoutInput {
  lineItems: CheckoutLineItem[];
  customer?: CheckoutCustomer;
  shippingAddress?: ShippingAddress;
  discountCodes?: string[];
  note?: string;
  customAttributes?: Array<{ key: string; value: string }>;
}

interface ProductData {
  title: string;
  description: string;
  vendor: string;
  productType?: string;
  tags?: string[];
  variants?: Array<{
    title: string;
    price: string;
    sku?: string;
    inventoryQuantity?: number;
    barcode?: string;
    weight?: number;
    weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  }>;
  images?: Array<{ src: string; alt?: string }>;
}

/**
 * Get Shopify configuration from environment variables
 */
function getShopifyConfig(): ShopifyConfig {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';

  if (!storeDomain || !accessToken) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN must be set'
    );
  }

  // Remove https:// and .myshopify.com if present
  const cleanDomain = storeDomain
    .replace(/^https?:\/\//, '')
    .replace(/\.myshopify\.com$/, '');

  return {
    storeDomain: cleanDomain,
    accessToken,
    apiVersion,
  };
}

/**
 * Shopify GraphQL Client with retry logic
 */
class ShopifyClient {
  private config: ShopifyConfig;
  private endpoint: string;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.config = getShopifyConfig();
    this.endpoint = `https://${this.config.storeDomain}.myshopify.com/api/${this.config.apiVersion}/graphql.json`;
  }

  /**
   * Make GraphQL request with retry logic
   */
  private async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    retries: number = this.maxRetries
  ): Promise<GraphQLResponse<T>> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.config.accessToken,
          },
          body: JSON.stringify({
            query,
            variables: variables || {},
          }),
        });

        if (!response.ok) {
          if (attempt < retries && response.status >= 500) {
            await this.sleep(this.retryDelay * attempt);
            continue;
          }
          throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
        }

        const data: GraphQLResponse<T> = await response.json();

        if (data.errors && data.errors.length > 0) {
          // Check if error is retryable
          const isRetryable = data.errors.some(error => {
            const message = error.message.toLowerCase();
            return message.includes('rate limit') || 
                   message.includes('timeout') ||
                   message.includes('server error');
          });

          if (isRetryable && attempt < retries) {
            await this.sleep(this.retryDelay * attempt);
            continue;
          }

          throw new Error(
            `GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`
          );
        }

        return data;
      } catch (error) {
        if (attempt === retries) {
          console.error('Shopify API request failed after retries:', error);
          throw error;
        }
        await this.sleep(this.retryDelay * attempt);
      }
    }

    throw new Error('Shopify API request failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create checkout session
   */
  async createCheckout(
    input: CheckoutInput
  ): Promise<{ checkoutId: string; checkoutUrl: string }> {
    const mutation = `
      mutation checkoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
          checkout {
            id
            webUrl
          }
          checkoutUserErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        lineItems: input.lineItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          customAttributes: item.customAttributes || [],
        })),
        email: input.customer?.email,
        shippingAddress: input.shippingAddress ? {
          address1: input.shippingAddress.address1,
          address2: input.shippingAddress.address2,
          city: input.shippingAddress.city,
          province: input.shippingAddress.province,
          country: input.shippingAddress.country,
          zip: input.shippingAddress.zip,
          firstName: input.shippingAddress.firstName,
          lastName: input.shippingAddress.lastName,
          phone: input.shippingAddress.phone,
        } : undefined,
        note: input.note,
        customAttributes: input.customAttributes || [],
      },
    };

    const response = await this.request<{
      checkoutCreate: {
        checkout: { id: string; webUrl: string } | null;
        checkoutUserErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, variables);

    if (response.data?.checkoutCreate.checkoutUserErrors.length) {
      const errors = response.data.checkoutCreate.checkoutUserErrors;
      throw new Error(
        `Checkout creation failed: ${errors.map(e => e.message).join(', ')}`
      );
    }

    const checkout = response.data?.checkoutCreate.checkout;
    if (!checkout) {
      throw new Error('Failed to create checkout');
    }

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.webUrl,
    };
  }

  /**
   * Update checkout
   */
  async updateCheckout(
    checkoutId: string,
    updates: {
      lineItems?: CheckoutLineItem[];
      shippingAddress?: ShippingAddress;
      discountCodes?: string[];
      email?: string;
      note?: string;
    }
  ): Promise<{ checkoutId: string; checkoutUrl: string }> {
    const mutation = `
      mutation checkoutUpdate($checkoutId: ID!, $input: CheckoutUpdateInput!) {
        checkoutUpdate(checkoutId: $checkoutId, input: $input) {
          checkout {
            id
            webUrl
          }
          checkoutUserErrors {
            field
            message
          }
        }
      }
    `;

    const input: any = {};

    if (updates.lineItems) {
      input.lineItems = updates.lineItems.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        customAttributes: item.customAttributes || [],
      }));
    }

    if (updates.shippingAddress) {
      input.shippingAddress = {
        address1: updates.shippingAddress.address1,
        address2: updates.shippingAddress.address2,
        city: updates.shippingAddress.city,
        province: updates.shippingAddress.province,
        country: updates.shippingAddress.country,
        zip: updates.shippingAddress.zip,
        firstName: updates.shippingAddress.firstName,
        lastName: updates.shippingAddress.lastName,
        phone: updates.shippingAddress.phone,
      };
    }

    if (updates.discountCodes) {
      input.discountCodes = updates.discountCodes;
    }

    if (updates.email) {
      input.email = updates.email;
    }

    if (updates.note) {
      input.note = updates.note;
    }

    const response = await this.request<{
      checkoutUpdate: {
        checkout: { id: string; webUrl: string } | null;
        checkoutUserErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, {
      checkoutId,
      input,
    });

    if (response.data?.checkoutUpdate.checkoutUserErrors.length) {
      const errors = response.data.checkoutUpdate.checkoutUserErrors;
      throw new Error(
        `Checkout update failed: ${errors.map(e => e.message).join(', ')}`
      );
    }

    const checkout = response.data?.checkoutUpdate.checkout;
    if (!checkout) {
      throw new Error('Failed to update checkout');
    }

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.webUrl,
    };
  }

  /**
   * Get checkout details
   */
  async getCheckout(checkoutId: string): Promise<any> {
    const query = `
      query getCheckout($id: ID!) {
        node(id: $id) {
          ... on Checkout {
            id
            webUrl
            subtotalPriceV2 {
              amount
              currencyCode
            }
            totalTaxV2 {
              amount
              currencyCode
            }
            totalPriceV2 {
              amount
              currencyCode
            }
            lineItems(first: 250) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    title
                    priceV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
            shippingAddress {
              address1
              address2
              city
              province
              country
              zip
            }
            email
            discountApplications(first: 10) {
              edges {
                node {
                  ... on DiscountCodeApplication {
                    code
                    applicable
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.request(query, { id: checkoutId });
    return response.data?.node;
  }

  /**
   * Complete checkout (create order)
   */
  async completeCheckout(checkoutId: string): Promise<{ orderId: string; orderUrl: string }> {
    const mutation = `
      mutation checkoutComplete($checkoutId: ID!) {
        checkoutComplete(checkoutId: $checkoutId) {
          checkout {
            id
            order {
              id
              name
              orderNumber
            }
          }
          checkoutUserErrors {
            field
            message
          }
          payment {
            id
            ready
          }
        }
      }
    `;

    const response = await this.request<{
      checkoutComplete: {
        checkout: { id: string; order: { id: string; name: string; orderNumber: number } | null } | null;
        checkoutUserErrors: Array<{ field: string[]; message: string }>;
        payment: { id: string; ready: boolean } | null;
      };
    }>(mutation, { checkoutId });

    if (response.data?.checkoutComplete.checkoutUserErrors.length) {
      const errors = response.data.checkoutComplete.checkoutUserErrors;
      throw new Error(
        `Checkout completion failed: ${errors.map(e => e.message).join(', ')}`
      );
    }

    const checkout = response.data?.checkoutComplete.checkout;
    if (!checkout?.order) {
      throw new Error('Failed to complete checkout');
    }

    return {
      orderId: checkout.order.id,
      orderUrl: `/orders/${checkout.order.orderNumber}`,
    };
  }

  /**
   * Create product in Shopify
   */
  async createProduct(_productData: ProductData): Promise<string> {
    // Note: Product creation requires Admin API, not Storefront API
    // This is a placeholder - implement with Admin API if needed
    throw new Error('Product creation requires Shopify Admin API');
  }

  /**
   * Update product in Shopify
   */
  async updateProduct(_id: string, _updates: Partial<ProductData>): Promise<void> {
    // Note: Product updates require Admin API, not Storefront API
    // This is a placeholder - implement with Admin API if needed
    throw new Error('Product updates require Shopify Admin API');
  }

  /**
   * Sync inventory/variants
   */
  async syncInventory(_variants: Array<{ variantId: string; quantity: number }>): Promise<void> {
    // Note: Inventory sync requires Admin API, not Storefront API
    // This is a placeholder - implement with Admin API if needed
    throw new Error('Inventory sync requires Shopify Admin API');
  }
}

/**
 * Webhook signature verification
 * Shopify uses HMAC SHA256 with base64 encoding
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('SHOPIFY_WEBHOOK_SECRET must be set');
  }

  // Calculate HMAC SHA256
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(body, 'utf8');
  const calculatedDigest = hmac.digest('base64');

  // Shopify sends signature as base64 string in X-Shopify-Hmac-Sha256 header
  // Compare using timing-safe comparison to prevent timing attacks
  if (calculatedDigest.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculatedDigest),
    Buffer.from(signature)
  );
}

/**
 * Handle order created webhook
 */
export function handleOrderCreated(orderData: any): void {
  try {
    console.log('Order created:', {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      totalPrice: orderData.total_price,
      customer: orderData.customer,
      lineItems: orderData.line_items,
    });

    // Process order data
    // - Update inventory in MongoDB
    // - Send confirmation email
    // - Update order status
    // - etc.
  } catch (error) {
    console.error('Error handling order created webhook:', error);
    throw error;
  }
}

/**
 * Handle order paid webhook
 */
export function handleOrderPaid(orderData: any): void {
  try {
    console.log('Order paid:', {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      financialStatus: orderData.financial_status,
      fulfillmentStatus: orderData.fulfillment_status,
    });

    // Process payment confirmation
    // - Update order status to paid
    // - Trigger fulfillment
    // - Send shipping notifications
    // - etc.
  } catch (error) {
    console.error('Error handling order paid webhook:', error);
    throw error;
  }
}

// Singleton instance
let shopifyClientInstance: ShopifyClient | null = null;

/**
 * Get Shopify client instance
 */
export function getShopifyClient(): ShopifyClient {
  if (!shopifyClientInstance) {
    shopifyClientInstance = new ShopifyClient();
  }
  return shopifyClientInstance;
}

// Export types
export type {
  CheckoutLineItem,
  CheckoutCustomer,
  ShippingAddress,
  CheckoutInput,
  ProductData,
};

