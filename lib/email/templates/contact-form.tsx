import { getBaseEmailHTML } from './base';

interface ContactFormData {
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject?: string;
  message: string;
  replyTo?: string;
}

export function getContactFormHTML(data: ContactFormData): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      You have received a new contact form submission:
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px; font-weight: 600;">Name:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Email:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
            <a href="mailto:${data.userEmail}" style="color: #2563eb; text-decoration: none;">${data.userEmail}</a>
          </td>
        </tr>
        ${data.userPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Phone:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
            <a href="tel:${data.userPhone}" style="color: #2563eb; text-decoration: none;">${data.userPhone}</a>
          </td>
        </tr>
        ` : ''}
        ${data.subject ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Subject:</td>
          <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.subject}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <h3 style="margin: 30px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Message</h3>
    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0; color: #1f2937; font-size: 16px; white-space: pre-wrap; line-height: 1.6;">${data.message}</p>
    </div>
    
    ${data.replyTo ? `
    <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 6px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>💬 Reply Directly:</strong> Click "Reply" in your email client to respond directly to <strong>${data.userEmail}</strong>
      </p>
    </div>
    ` : ''}
  `;
  
  return getBaseEmailHTML({
    title: 'New Contact Form Submission',
    preheader: `From ${data.userName}${data.subject ? `: ${data.subject}` : ''}`,
    children: content,
    primaryButton: data.userEmail ? {
      text: 'Reply via Email',
      url: `mailto:${data.userEmail}${data.subject ? `?subject=Re: ${encodeURIComponent(data.subject)}` : ''}`,
    } : undefined,
  });
}


