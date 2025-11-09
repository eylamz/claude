import { getBaseEmailHTML } from './base';

interface NewOrderNotification {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  itemCount: number;
  orderUrl: string;
}

export function getNewOrderNotificationHTML(data: NewOrderNotification): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      A new order has been placed and requires your attention.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 6px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Order Number:</td>
          <td style="padding: 8px 0; color: #92400e; font-size: 18px; font-weight: 700; font-family: monospace;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Customer:</td>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px;">
            <a href="mailto:${data.customerEmail}" style="color: #2563eb; text-decoration: none;">${data.customerEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Items:</td>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px;">${data.itemCount} item${data.itemCount > 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Total:</td>
          <td style="padding: 8px 0; color: #92400e; font-size: 18px; font-weight: 700;">₪${data.total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;
  
  return getBaseEmailHTML({
    title: '🔔 New Order Notification',
    preheader: `Order #${data.orderNumber} - ₪${data.total.toFixed(2)}`,
    children: content,
    primaryButton: {
      text: 'View Order Details',
      url: data.orderUrl,
    },
  });
}

interface LowStockNotification {
  productName: string;
  currentStock: number;
  threshold: number;
  productUrl: string;
}

export function getLowStockNotificationHTML(data: LowStockNotification): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      A product is running low on stock and may need restocking soon.
    </p>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 6px;">
      <p style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px; font-weight: 600;">${data.productName}</p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">Current Stock:</td>
          <td style="padding: 8px 0; color: #991b1b; font-size: 24px; font-weight: 700;">${data.currentStock} units</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">Threshold:</td>
          <td style="padding: 8px 0; color: #991b1b; font-size: 14px;">${data.threshold} units</td>
        </tr>
      </table>
    </div>
  `;
  
  return getBaseEmailHTML({
    title: '⚠️ Low Stock Alert',
    preheader: `${data.productName} - ${data.currentStock} units remaining`,
    children: content,
    primaryButton: {
      text: 'View Product',
      url: data.productUrl,
    },
  });
}

interface NewReviewNotification {
  contentType: 'product' | 'skatepark' | 'event' | 'guide';
  contentName: string;
  reviewerName: string;
  rating: number;
  hasComment: boolean;
  reviewUrl: string;
}

export function getNewReviewNotificationHTML(data: NewReviewNotification): string {
  const stars = '⭐'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
  
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      A new review has been submitted and is awaiting moderation.
    </p>
    
    <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 6px;">
      <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 600;">${data.contentName}</p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Reviewer:</td>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px;">${data.reviewerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Rating:</td>
          <td style="padding: 8px 0; color: #1e40af; font-size: 18px;">${stars} (${data.rating}/5)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Type:</td>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px; text-transform: capitalize;">${data.contentType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Has Comment:</td>
          <td style="padding: 8px 0; color: #1e40af; font-size: 14px;">${data.hasComment ? 'Yes' : 'No'}</td>
        </tr>
      </table>
    </div>
  `;
  
  return getBaseEmailHTML({
    title: '⭐ New Review Submission',
    preheader: `${data.rating}-star review for ${data.contentName}`,
    children: content,
    primaryButton: {
      text: 'Review & Moderate',
      url: data.reviewUrl,
    },
  });
}

interface ContactFormNotification {
  userName: string;
  userEmail: string;
  subject?: string;
  messagePreview: string;
  formUrl: string;
}

export function getContactFormNotificationHTML(data: ContactFormNotification): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      A new contact form submission has been received.
    </p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 6px;">
      <p style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">${data.userName}</p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px;">
            <a href="mailto:${data.userEmail}" style="color: #2563eb; text-decoration: none;">${data.userEmail}</a>
          </td>
        </tr>
        ${data.subject ? `
        <tr>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">Subject:</td>
          <td style="padding: 8px 0; color: #065f46; font-size: 14px;">${data.subject}</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2" style="padding: 12px 0 0 0; color: #065f46; font-size: 14px;">
            <strong>Preview:</strong> ${data.messagePreview.substring(0, 150)}${data.messagePreview.length > 150 ? '...' : ''}
          </td>
        </tr>
      </table>
    </div>
  `;
  
  return getBaseEmailHTML({
    title: '📧 New Contact Form Submission',
    preheader: `From ${data.userName}${data.subject ? `: ${data.subject}` : ''}`,
    children: content,
    primaryButton: {
      text: 'View Full Message',
      url: data.formUrl,
    },
  });
}


