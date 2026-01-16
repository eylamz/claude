# Email Service

Unified email service with support for EmailJS (client-side) and Nodemailer (server-side), including retry logic, rate limiting, queue system, and unsubscribe handling.

## Features

- ✅ **Multiple Providers**: EmailJS (client) and Nodemailer (server)
- ✅ **Retry Logic**: Exponential backoff with configurable max retries
- ✅ **Rate Limiting**: Prevents spam (10 emails/minute per recipient)
- ✅ **Queue System**: Bulk email processing with priority support
- ✅ **Unsubscribe Handling**: Easy unsubscribe/resubscribe management
- ✅ **Template System**: Responsive HTML templates with inline CSS
- ✅ **Error Handling**: Comprehensive error logging and recovery
- ✅ **Test Mode**: Development mode for testing without sending emails

## Quick Start

```typescript
import { emailService } from '@/lib/email';

// Send order confirmation
await emailService.sendOrderConfirmation({
  orderNumber: 'ORD-12345',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  items: [
    { image: 'https://...', name: 'Product 1', quantity: 2, price: 99.99 }
  ],
  subtotal: 199.98,
  shipping: 15.00,
  total: 214.98,
  shippingAddress: {
    name: 'John Doe',
    street: '123 Main St',
    city: 'Tel Aviv',
    zip: '12345',
    country: 'Israel'
  },
  trackingUrl: 'https://enboss.co/orders/ORD-12345'
});

// Send welcome email
await emailService.sendWelcomeEmail({
  email: 'user@example.com',
  name: 'Jane Doe',
  discountCode: 'WELCOME10',
  discountPercent: 10
});
```

## Available Functions

### `sendOrderConfirmation(order)`
Sends order confirmation with item details, shipping info, and tracking link.

### `sendWelcomeEmail(user)`
Sends welcome email with discount code and account benefits.

### `sendPasswordReset(email, resetUrl, expiryHours?)`
Sends password reset link with expiry notice.

### `sendContactForm(data)`
Sends contact form submission to admin.

### `sendAdminNotification(type, data)`
Sends admin notifications for:
- `new_order` - New order placed
- `low_stock` - Product running low
- `new_review` - New review submitted
- `contact_form` - New contact form

### `sendBulk(recipients, templateFn, subjectFn, priority?)`
Queues bulk emails for batch processing.

### `unsubscribe(email, reason?)`
Adds email to unsubscribe list.

### `resubscribe(email)`
Removes email from unsubscribe list.

## Configuration

### Environment Variables

```env
# Nodemailer (Server-side)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@enboss.co

# EmailJS (Client-side)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key

# Recipients
ADMIN_NOTIFICATION_EMAIL=admin@enboss.co
CONTACT_FORM_RECIPIENT=contact@enboss.co

# Test Mode
EMAIL_TEST_MODE=true  # Only in development
```

### EmailJS Setup

1. Create account at https://www.emailjs.com
2. Create email service (Gmail, Outlook, etc.)
3. Create templates for each email type:
   - `contact_form`
   - `order_confirmation`
   - `welcome`
   - `password_reset`
   - `admin_new_order`
   - `admin_low_stock`
   - `admin_new_review`
   - `admin_contact_form`

4. Add environment variables to `.env.local`

## Template Variables

### Order Confirmation
- `to_email` - Customer email
- `order_number` - Order number
- `customer_name` - Customer name
- `items_list` - Formatted items list
- `total` - Total amount
- `order_url` - Tracking URL

### Welcome Email
- `to_email` - User email
- `user_name` - User name
- `discount_code` - Discount code
- `discount_percent` - Discount percentage

### Password Reset
- `to_email` - User email
- `reset_url` - Reset link
- `expiry_hours` - Hours until expiry

## Queue System

The service automatically queues emails when under load:

```typescript
// Check queue status
const status = emailService.getQueueStatus();
console.log(`Queue: ${status.length} emails, Processing: ${status.processing}`);
```

## Rate Limiting

- **Window**: 1 minute
- **Max emails**: 10 per recipient per window
- **Action**: Queued emails are delayed if rate limit exceeded

## Error Handling

All functions throw errors on failure. Retry logic automatically handles transient failures:

```typescript
try {
  await emailService.sendOrderConfirmation(order);
} catch (error) {
  console.error('Failed to send email:', error);
  // Handle error (log to monitoring, notify admin, etc.)
}
```

## Test Mode

In development, set `EMAIL_TEST_MODE=true` to log emails instead of sending:

```bash
# .env.local
EMAIL_TEST_MODE=true
```

## Unsubscribe System

```typescript
// Unsubscribe user
emailService.unsubscribe('user@example.com', 'User requested');

// Resubscribe
emailService.resubscribe('user@example.com');

// Check if unsubscribed (automatic in send functions)
// Unsubscribed emails are automatically skipped
```

## Client vs Server Usage

- **Client-side**: Uses EmailJS for contact forms and user-initiated emails
- **Server-side**: Uses Nodemailer for transactional emails (orders, password reset)
- **Automatic**: Service detects context and uses appropriate provider

## Examples

See usage examples in:
- `app/api/orders/[id]/confirm/route.ts` - Order confirmation
- `app/api/auth/register/route.ts` - Welcome email
- `app/api/contact/route.ts` - Contact form
- `app/api/admin/notifications/route.ts` - Admin notifications


