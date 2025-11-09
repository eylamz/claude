import { getBaseEmailHTML, getProductRowHTML } from './base';

interface OrderItem {
  image: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationData {
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax?: number;
  discount?: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
  };
  trackingUrl?: string;
}

export function getOrderConfirmationHTML(data: OrderConfirmationData): string {
  const itemsHTML = data.items.map(item => getProductRowHTML(item)).join('');
  
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      Thank you for your order! We've received your order and are preparing it for shipment.
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; font-weight: 600;">ORDER NUMBER</p>
      <p style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 700; font-family: monospace;">#${data.orderNumber}</p>
    </div>
    
    <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Order Details</h3>
    
    ${itemsHTML}
    
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
        <td align="right" style="padding: 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">₪${data.subtotal.toFixed(2)}</td>
      </tr>
      ${data.discount ? `
      <tr>
        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Discount</td>
        <td align="right" style="padding: 12px 0; color: #10b981; font-size: 14px; font-weight: 600;">-₪${data.discount.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Shipping</td>
        <td align="right" style="padding: 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">₪${data.shipping.toFixed(2)}</td>
      </tr>
      ${data.tax ? `
      <tr>
        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Tax</td>
        <td align="right" style="padding: 12px 0; color: #1f2937; font-size: 14px; font-weight: 600;">₪${data.tax.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr style="border-top: 2px solid #e5e7eb;">
        <td style="padding: 15px 0; color: #1f2937; font-size: 18px; font-weight: 700;">Total</td>
        <td align="right" style="padding: 15px 0; color: #1f2937; font-size: 18px; font-weight: 700;">₪${data.total.toFixed(2)}</td>
      </tr>
    </table>
    
    <h3 style="margin: 30px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Shipping Address</h3>
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
      <p style="margin: 0 0 5px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${data.shippingAddress.name}</p>
      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">${data.shippingAddress.street}</p>
      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">${data.shippingAddress.city}, ${data.shippingAddress.zip}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">${data.shippingAddress.country}</p>
    </div>
  `;
  
  return getBaseEmailHTML({
    title: 'Order Confirmation',
    preheader: `Your order #${data.orderNumber} has been confirmed`,
    children: content,
    primaryButton: data.trackingUrl ? {
      text: 'Track Your Order',
      url: data.trackingUrl,
    } : undefined,
    footerNote: 'We\'ll send you an email when your order ships.',
  });
}


