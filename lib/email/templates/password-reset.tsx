import { getBaseEmailHTML } from './base';

interface PasswordResetData {
  resetUrl: string;
  expiryHours: number;
}

export function getPasswordResetHTML(data: PasswordResetData): string {
  const content = `
    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">
      You requeste/d to reset your password. Click the button below to create a new password:
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

/**
 * Translations for password reset and email verification email templates
 */
const translations: Record<string, Record<string, Record<string, string>>> = {
  en: {
    password_reset: {
      title: 'Password Reset Request',
      subject_title: 'Reset Your Password',
      intro: 'You requested to reset your password. Click the link below to create a new password:',
      link_text: 'Reset Password',
      expiry_note: 'This link will expire in 15 minutes.',
      security_note: 'If you didn\'t request this, you can safely ignore this email.',
      regards_text: 'Best regards,',
      footer_sent_to: 'This email was sent to',
      footer_reason: 'You received this email because a password reset was requested for your account.',
    },
    email_verification: {
      title: 'Email Verification',
      subject_title: 'Verify Your Email Address',
      intro: 'Please verify your email address by clicking the link below:',
      link_text: 'Verify Email',
      expiry_note: 'This link will expire in 15 minutes.',
      security_note: 'If you didn\'t request this, you can safely ignore this email.',
      regards_text: 'Best regards,',
      footer_sent_to: 'This email was sent to',
      footer_reason: 'You received this email because an email verification was requested for your account.',
    },
  },
  he: {
    password_reset: {
      title: 'בקשת איפוס סיסמה',
      subject_title: 'איפוס סיסמה עבור החשבון שלך',
      intro: 'ביקשת לאפס את הסיסמה שלך. לחץ על הקישור למטה כדי ליצור סיסמה חדשה:',
      link_text: 'אפס סיסמה',
      expiry_note: 'קישור זה יפוג בעוד 15 דקות.',
      security_note: 'אם לא ביקשת זאת, תוכל להתעלם בבטחה מהאימייל הזה.',
      regards_text: 'בברכה,',
      footer_sent_to: 'אימייל זה נשלח ל',
      footer_reason: 'קיבלת את האימייל הזה כי בוצעה בקשה לאיפוס סיסמה עבור החשבון שלך.',
    },
    email_verification: {
      title: 'אימות אימייל',
      subject_title: 'אימות כתובת האימייל שלך',
      intro: 'אנא אמת את כתובת האימייל שלך על ידי לחיצה על הקישור למטה:',
      link_text: 'אמת אימייל',
      expiry_note: 'קישור זה יפוג בעוד 15 דקות.',
      security_note: 'אם לא ביקשת זאת, תוכל להתעלם בבטחה מהאימייל הזה.',
      regards_text: 'בברכה,',
      footer_sent_to: 'אימייל זה נשלח ל',
      footer_reason: 'קיבלת את האימייל הזה כי בוצעה בקשה לאימות אימייל עבור החשבון שלך.',
    },
  },
};

/**
 * Generate EmailJS template variables for password reset or email verification email
 * @param email - Recipient email address
 * @param link - Reset/verification link URL
 * @param locale - Locale code ('en' or 'he')
 * @param type - Email type ('password_reset' or 'email_verification')
 * @returns Object with all template variables for EmailJS
 */
export function getPasswordResetEmailJSTemplateParams(
  email: string,
  link: string,
  locale: string = 'en',
  type: string = 'password_reset'
): Record<string, string> {
  // Default to 'en' if locale is not supported
  const currentLocale = locale === 'he' ? 'he' : 'en';
  // Default to 'password_reset' if type is not supported
  const emailType = type === 'email_verification' ? 'email_verification' : 'password_reset';
  const t = translations[currentLocale][emailType];
  
  // Get site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  
  const logoUrl = `https://res.cloudinary.com/dr0rvohz9/image/upload/v1768589838/qypmksptqoaqihlra354.png`;
  // Determine direction and alignment based on locale
  const dir = currentLocale === 'he' ? 'rtl' : 'ltr';
  const align = currentLocale === 'he' ? 'right' : 'left';
  
  return {
    logo_url: logoUrl,
    dir,
    align,
    title: t.title,
    subject_title: t.subject_title,
    intro: t.intro,
    link_text: t.link_text,
    expiry_note: t.expiry_note,
    security_note: t.security_note,
    regards_text: t.regards_text,
    footer_sent_to: t.footer_sent_to,
    footer_reason: t.footer_reason,
    link,
    email,
    site_url: siteUrl,
  };
}


