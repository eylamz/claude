import { getBaseEmailHTML } from './base';

interface WelcomeEmailData {
  userName: string;
  discountCode?: string;
  discountPercent?: number;
}

export function getWelcomeEmailHTML(data: WelcomeEmailData): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      Welcome to ENBOSS, ${data.userName}! We're excited to have you join our community.
    </p>
    
    <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
      As a member, you'll enjoy:
    </p>
    
    <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #1f2937; font-size: 16px;">
      <li style="margin-bottom: 10px;">Exclusive early access to new products</li>
      <li style="margin-bottom: 10px;">Special member-only discounts</li>
      <li style="margin-bottom: 10px;">Event invitations and community updates</li>
      <li style="margin-bottom: 10px;">Wishlist and order tracking</li>
    </ul>
    
    ${data.discountCode ? `
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Special Offer</p>
      <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 32px; font-weight: 700;">${data.discountPercent || 10}% OFF</p>
      <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: monospace; background-color: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 4px; display: inline-block;">${data.discountCode}</p>
      <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 12px;">Use this code on your first purchase</p>
    </div>
    ` : ''}
    
    <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px;">
      Follow us on social media to stay connected:
    </p>
    
    <table role="presentation" style="width: 100%; margin: 20px 0;">
      <tr>
        <td align="center">
          <a href="https://instagram.com/enboss" style="display: inline-block; margin: 0 10px; padding: 10px 20px; background-color: #f9fafb; color: #2563eb; text-decoration: none; border-radius: 6px; font-weight: 600;">Instagram</a>
          <a href="https://facebook.com/enboss" style="display: inline-block; margin: 0 10px; padding: 10px 20px; background-color: #f9fafb; color: #2563eb; text-decoration: none; border-radius: 6px; font-weight: 600;">Facebook</a>
          <a href="https://twitter.com/enboss" style="display: inline-block; margin: 0 10px; padding: 10px 20px; background-color: #f9fafb; color: #2563eb; text-decoration: none; border-radius: 6px; font-weight: 600;">Twitter</a>
        </td>
      </tr>
    </table>
  `;
  
  return getBaseEmailHTML({
    title: 'Welcome to ENBOSS!',
    preheader: 'Join the community and discover amazing products',
    children: content,
    primaryButton: {
      text: 'Start Shopping',
      url: 'https://enboss.com/shop',
    },
  });
}


