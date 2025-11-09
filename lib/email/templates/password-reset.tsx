import { getBaseEmailHTML } from './base';

interface PasswordResetData {
  resetUrl: string;
  expiryHours: number;
}

export function getPasswordResetHTML(data: PasswordResetData): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      You requested to reset your password. Click the button below to create a new password:
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Security Notice:</strong> This link will expire in ${data.expiryHours} hour${data.expiryHours > 1 ? 's' : ''}. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    
    <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 0; padding: 15px; background-color: #f9fafb; border-radius: 6px; word-break: break-all; color: #2563eb; font-size: 12px; font-family: monospace;">
      ${data.resetUrl}
    </p>
  `;
  
  return getBaseEmailHTML({
    title: 'Password Reset Request',
    preheader: 'Click to reset your password',
    children: content,
    primaryButton: {
      text: 'Reset Password',
      url: data.resetUrl,
    },
    footerNote: 'This is an automated message. Please do not reply to this email.',
  });
}


