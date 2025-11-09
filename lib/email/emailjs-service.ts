/**
 * EmailJS service integration
 * For client-side email sending (contact forms, etc.)
 */

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

/**
 * Initialize EmailJS (call this once in your app)
 */
export async function initEmailJS() {
  if (typeof window === 'undefined' || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured');
    return;
  }

  try {
    // Dynamically import EmailJS SDK
    const emailjs = await import('@emailjs/browser');
    await emailjs.init(EMAILJS_PUBLIC_KEY);
    return emailjs;
  } catch (error) {
    console.error('Failed to initialize EmailJS:', error);
    throw error;
  }
}

/**
 * Send email via EmailJS
 */
export async function sendEmailJS(
  templateId: string,
  templateParams: Record<string, any>,
  serviceId?: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('EmailJS can only be used on the client side');
  }

  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID) {
    throw new Error('EmailJS is not configured. Please set NEXT_PUBLIC_EMAILJS_PUBLIC_KEY and NEXT_PUBLIC_EMAILJS_SERVICE_ID');
  }

  try {
    const emailjs = await import('@emailjs/browser');
    
    if (!emailjs || !emailjs.send) {
      throw new Error('EmailJS SDK not loaded');
    }

    await emailjs.send(
      serviceId || EMAILJS_SERVICE_ID,
      templateId,
      templateParams
    );
  } catch (error) {
    console.error('Failed to send email via EmailJS:', error);
    throw error;
  }
}

/**
 * Template IDs for different email types
 * Configure these in your EmailJS dashboard
 */
export const EMAILJS_TEMPLATES = {
  CONTACT_FORM: 'contact_form',
  ORDER_CONFIRMATION: 'order_confirmation',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  ADMIN_NEW_ORDER: 'admin_new_order',
  ADMIN_LOW_STOCK: 'admin_low_stock',
  ADMIN_NEW_REVIEW: 'admin_new_review',
  ADMIN_CONTACT_FORM: 'admin_contact_form',
} as const;

/**
 * Helper to send contact form via EmailJS
 */
export async function sendContactFormEmailJS(data: {
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject?: string;
  message: string;
  replyTo?: string;
}): Promise<void> {
  await sendEmailJS(EMAILJS_TEMPLATES.CONTACT_FORM, {
    user_name: data.userName,
    user_email: data.userEmail,
    user_phone: data.userPhone || '',
    subject: data.subject || 'Contact Form Submission',
    message: data.message,
    reply_to: data.replyTo || data.userEmail,
    to_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@enboss.com',
  });
}

/**
 * Helper to send order confirmation via EmailJS
 */
export async function sendOrderConfirmationEmailJS(data: {
  toEmail: string;
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  orderUrl: string;
}): Promise<void> {
  const itemsList = data.items
    .map(item => `${item.name} x${item.quantity} - ₪${item.price.toFixed(2)}`)
    .join('\n');

  await sendEmailJS(EMAILJS_TEMPLATES.ORDER_CONFIRMATION, {
    to_email: data.toEmail,
    order_number: data.orderNumber,
    customer_name: data.customerName,
    items_list: itemsList,
    total: `₪${data.total.toFixed(2)}`,
    order_url: data.orderUrl,
  });
}

/**
 * Helper to send welcome email via EmailJS
 */
export async function sendWelcomeEmailJS(data: {
  toEmail: string;
  userName: string;
  discountCode?: string;
  discountPercent?: number;
}): Promise<void> {
  await sendEmailJS(EMAILJS_TEMPLATES.WELCOME, {
    to_email: data.toEmail,
    user_name: data.userName,
    discount_code: data.discountCode || '',
    discount_percent: data.discountPercent?.toString() || '',
  });
}

/**
 * Helper to send password reset via EmailJS
 */
export async function sendPasswordResetEmailJS(data: {
  toEmail: string;
  resetUrl: string;
  expiryHours: number;
}): Promise<void> {
  await sendEmailJS(EMAILJS_TEMPLATES.PASSWORD_RESET, {
    to_email: data.toEmail,
    reset_url: data.resetUrl,
    expiry_hours: data.expiryHours.toString(),
  });
}

/**
 * Helper to send admin notifications via EmailJS
 */
export async function sendAdminNotificationEmailJS(
  type: 'new_order' | 'low_stock' | 'new_review' | 'contact_form',
  data: Record<string, any>
): Promise<void> {
  const templateMap = {
    new_order: EMAILJS_TEMPLATES.ADMIN_NEW_ORDER,
    low_stock: EMAILJS_TEMPLATES.ADMIN_LOW_STOCK,
    new_review: EMAILJS_TEMPLATES.ADMIN_NEW_REVIEW,
    contact_form: EMAILJS_TEMPLATES.ADMIN_CONTACT_FORM,
  };

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@enboss.com';

  await sendEmailJS(templateMap[type], {
    to_email: adminEmail,
    ...data,
  });
}


