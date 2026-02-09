/**
 * Email Service
 * Unified email sending service with retry logic, rate limiting, and queue support
 */

import { sendEmail } from './send';

// Import template functions directly from individual files to avoid module resolution issues
import { getOrderConfirmationHTML } from './templates/order-confirmation';
import { getWelcomeEmailHTML } from './templates/welcome';
import { getPasswordResetHTML } from './templates/password-reset';
import { getContactFormHTML } from './templates/contact-form';
import {
  getNewOrderNotificationHTML,
  getLowStockNotificationHTML,
  getNewReviewNotificationHTML,
  getContactFormNotificationHTML,
} from './templates/admin-notifications';
import {
  sendContactFormEmailJS,
  sendOrderConfirmationEmailJS,
  sendWelcomeEmailJS,
  sendPasswordResetEmailJS,
  sendAdminNotificationEmailJS,
} from './emailjs-service';

type EmailProvider = 'nodemailer' | 'emailjs' | 'test';

interface EmailQueueItem {
  id: string;
  type: string;
  to: string;
  subject: string;
  html: string;
  retries: number;
  createdAt: Date;
  priority: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: Date;
  };
}

interface UnsubscribeList {
  emails: Set<string>;
  reasons: Map<string, string>;
}

class EmailService {
  private provider: EmailProvider;
  private queue: EmailQueueItem[] = [];
  private isProcessing = false;
  private rateLimitStore: RateLimitStore = {};
  private unsubscribeList: UnsubscribeList = {
    emails: new Set(),
    reasons: new Map(),
  };
  
  // Configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX = 10; // 10 emails per minute per recipient
  private readonly QUEUE_BATCH_SIZE = 5;
  private readonly TEST_MODE = process.env.NODE_ENV === 'development' && 
    process.env.EMAIL_TEST_MODE === 'true';

  constructor() {
    // Determine provider
    if (this.TEST_MODE) {
      this.provider = 'test';
    } else if (process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY && typeof window !== 'undefined') {
      this.provider = 'emailjs';
    } else {
      this.provider = 'nodemailer';
    }

    // Load unsubscribe list from storage
    this.loadUnsubscribeList();
  }

  /**
   * Check if email is unsubscribed
   */
  private isUnsubscribed(email: string): boolean {
    return this.unsubscribeList.emails.has(email.toLowerCase());
  }

  /**
   * Add email to unsubscribe list
   */
  public unsubscribe(email: string, reason?: string): void {
    const normalized = email.toLowerCase();
    this.unsubscribeList.emails.add(normalized);
    if (reason) {
      this.unsubscribeList.reasons.set(normalized, reason);
    }
    this.saveUnsubscribeList();
  }

  /**
   * Remove email from unsubscribe list
   */
  public resubscribe(email: string): void {
    const normalized = email.toLowerCase();
    this.unsubscribeList.emails.delete(normalized);
    this.unsubscribeList.reasons.delete(normalized);
    this.saveUnsubscribeList();
  }

  /**
   * Load unsubscribe list from localStorage (client) or file/db (server)
   */
  private loadUnsubscribeList(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('email_unsubscribes');
        if (stored) {
          const data = JSON.parse(stored);
          this.unsubscribeList.emails = new Set(data.emails || []);
          this.unsubscribeList.reasons = new Map(data.reasons || []);
        }
      } catch (error) {
        console.error('Failed to load unsubscribe list:', error);
      }
    }
    // In production, load from database
  }

  /**
   * Save unsubscribe list
   */
  private saveUnsubscribeList(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('email_unsubscribes', JSON.stringify({
          emails: Array.from(this.unsubscribeList.emails),
          reasons: Array.from(this.unsubscribeList.reasons.entries()),
        }));
      } catch (error) {
        console.error('Failed to save unsubscribe list:', error);
      }
    }
    // In production, save to database
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(email: string): boolean {
    const key = email.toLowerCase();
    const now = new Date();
    const limit = this.rateLimitStore[key];

    if (!limit || now > limit.resetAt) {
      this.rateLimitStore[key] = {
        count: 1,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
      };
      return true;
    }

    if (limit.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Send email with retry logic
   */
  private async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    retries = 0
  ): Promise<void> {
    try {
      if (this.TEST_MODE) {
        console.log('[EMAIL TEST MODE]', { to, subject, preview: html.substring(0, 100) });
        return;
      }

      if (this.provider === 'emailjs') {
        // EmailJS is handled differently - templates are rendered client-side
        throw new Error('EmailJS should be called directly, not through sendWithRetry');
      }

      await sendEmail(to, subject, html);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[EMAIL SENT] ${to} - ${subject}`);
      }
    } catch (error: any) {
      if (retries < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retries); // Exponential backoff
        console.warn(`[EMAIL RETRY] Attempt ${retries + 1}/${this.MAX_RETRIES} for ${to}`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWithRetry(to, subject, html, retries + 1);
      }
      
      console.error(`[EMAIL FAILED] After ${this.MAX_RETRIES} retries:`, error);
      throw new Error(`Failed to send email after ${this.MAX_RETRIES} retries: ${error.message}`);
    }
  }

  /**
   * Add email to queue
   */
  private async queueEmail(
    type: string,
    to: string,
    subject: string,
    html: string,
    priority = 0
  ): Promise<void> {
    const item: EmailQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      to,
      subject,
      html,
      retries: 0,
      createdAt: new Date(),
      priority,
    };

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process email queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.QUEUE_BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            if (this.isUnsubscribed(item.to)) {
              console.log(`[EMAIL SKIPPED] Unsubscribed: ${item.to}`);
              return;
            }

            if (!this.checkRateLimit(item.to)) {
              console.warn(`[EMAIL RATE LIMITED] ${item.to}`);
              // Re-queue with lower priority
              this.queue.push({ ...item, priority: item.priority - 1 });
              return;
            }

            await this.sendWithRetry(item.to, item.subject, item.html, item.retries);
          } catch (error) {
            if (item.retries < this.MAX_RETRIES) {
              item.retries++;
              this.queue.push(item);
            } else {
              console.error(`[EMAIL QUEUE FAILED] ${item.to}:`, error);
            }
          }
        })
      );

      // Small delay between batches
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    items: Array<{
      image: string;
      name: string;
      quantity: number;
      price: number;
    }>;
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
  }): Promise<void> {
    if (this.isUnsubscribed(order.customerEmail)) {
      return;
    }

    const html = getOrderConfirmationHTML(order);
    const subject = `Order Confirmation #${order.orderNumber}`;

    if (this.provider === 'emailjs' && typeof window !== 'undefined') {
      try {
        await sendOrderConfirmationEmailJS({
          toEmail: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          items: order.items,
          total: order.total,
          orderUrl: order.trackingUrl || `https://enboss.co/orders/${order.orderNumber}`,
        });
      } catch (error) {
        console.error('Failed to send order confirmation via EmailJS:', error);
        throw error;
      }
    } else {
      await this.sendWithRetry(order.customerEmail, subject, html);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user: {
    email: string;
    name: string;
    discountCode?: string;
    discountPercent?: number;
  }): Promise<void> {
    if (this.isUnsubscribed(user.email)) {
      return;
    }

    const html = getWelcomeEmailHTML({
      userName: user.name,
      discountCode: user.discountCode,
      discountPercent: user.discountPercent,
    });
    const subject = 'Welcome to ENBOSS!';

    if (this.provider === 'emailjs' && typeof window !== 'undefined') {
      try {
        await sendWelcomeEmailJS({
          toEmail: user.email,
          userName: user.name,
          discountCode: user.discountCode,
          discountPercent: user.discountPercent,
        });
      } catch (error) {
        console.error('Failed to send welcome email via EmailJS:', error);
        throw error;
      }
    } else {
      await this.sendWithRetry(user.email, subject, html);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetUrl: string, expiryHours = 1): Promise<void> {
    if (this.isUnsubscribed(email)) {
      return;
    }

    const html = getPasswordResetHTML({
      resetUrl,
      expiryHours,
    });
    const subject = 'Password Reset Request';

    if (this.provider === 'emailjs' && typeof window !== 'undefined') {
      try {
        await sendPasswordResetEmailJS({
          toEmail: email,
          resetUrl,
        });
      } catch (error) {
        console.error('Failed to send password reset via EmailJS:', error);
        throw error;
      }
    } else {
      await this.sendWithRetry(email, subject, html);
    }
  }

  /**
   * Send contact form submission
   */
  async sendContactForm(data: {
    userName: string;
    userEmail: string;
    userPhone?: string;
    subject?: string;
    message: string;
    replyTo?: string;
  }): Promise<void> {
    // Always send contact forms (they're user-initiated)
    
    if (this.provider === 'emailjs' && typeof window !== 'undefined') {
      try {
        await sendContactFormEmailJS(data);
      } catch (error) {
        console.error('Failed to send contact form via EmailJS:', error);
        throw error;
      }
    } else {
      const html = getContactFormHTML(data);
      const subject = data.subject || `Contact Form: ${data.userName}`;
      const recipient = process.env.CONTACT_FORM_RECIPIENT || 'contact@enboss.co';
      
      await this.sendWithRetry(recipient, subject, html);
    }
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(
    type: 'new_order' | 'low_stock' | 'new_review' | 'contact_form',
    data: any
  ): Promise<void> {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@enboss.co';

    let html: string;
    let subject: string;

    switch (type) {
      case 'new_order':
        html = getNewOrderNotificationHTML(data);
        subject = `🔔 New Order #${data.orderNumber}`;
        break;
      case 'low_stock':
        html = getLowStockNotificationHTML(data);
        subject = `⚠️ Low Stock Alert: ${data.productName}`;
        break;
      case 'new_review':
        html = getNewReviewNotificationHTML(data);
        subject = `⭐ New Review: ${data.contentName}`;
        break;
      case 'contact_form':
        html = getContactFormNotificationHTML(data);
        subject = `📧 Contact Form: ${data.userName}`;
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    if (this.provider === 'emailjs' && typeof window !== 'undefined') {
      try {
        await sendAdminNotificationEmailJS(type, {
          subject,
          ...data,
        });
      } catch (error) {
        console.error('Failed to send admin notification via EmailJS:', error);
        throw error;
      }
    } else {
      await this.sendWithRetry(adminEmail, subject, html);
    }
  }

  /**
   * Send bulk emails (queued)
   */
  async sendBulk(
    recipients: Array<{ email: string; data: Record<string, any> }>,
    templateFn: (data: any) => string,
    subjectFn: (data: any) => string,
    priority = 0
  ): Promise<void> {
    for (const recipient of recipients) {
      if (this.isUnsubscribed(recipient.email)) {
        continue;
      }

      const html = templateFn(recipient.data);
      const subject = subjectFn(recipient.data);

      await this.queueEmail('bulk', recipient.email, subject, html, priority);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { length: number; processing: boolean } {
    return {
      length: this.queue.length,
      processing: this.isProcessing,
    };
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

// Convenience exports
export const emailService = {
  sendOrderConfirmation: (order: Parameters<EmailService['sendOrderConfirmation']>[0]) =>
    getEmailService().sendOrderConfirmation(order),
  
  sendWelcomeEmail: (user: Parameters<EmailService['sendWelcomeEmail']>[0]) =>
    getEmailService().sendWelcomeEmail(user),
  
  sendPasswordReset: (email: string, resetUrl: string, expiryHours?: number) =>
    getEmailService().sendPasswordReset(email, resetUrl, expiryHours),
  
  sendContactForm: (data: Parameters<EmailService['sendContactForm']>[0]) =>
    getEmailService().sendContactForm(data),
  
  sendAdminNotification: (
    type: Parameters<EmailService['sendAdminNotification']>[0],
    data: any
  ) => getEmailService().sendAdminNotification(type, data),
  
  sendBulk: (
    recipients: Parameters<EmailService['sendBulk']>[0],
    templateFn: Parameters<EmailService['sendBulk']>[1],
    subjectFn: Parameters<EmailService['sendBulk']>[2],
    priority?: number
  ) => getEmailService().sendBulk(recipients, templateFn, subjectFn, priority),
  
  unsubscribe: (email: string, reason?: string) =>
    getEmailService().unsubscribe(email, reason),
  
  resubscribe: (email: string) =>
    getEmailService().resubscribe(email),
  
  getQueueStatus: () => getEmailService().getQueueStatus(),
};


