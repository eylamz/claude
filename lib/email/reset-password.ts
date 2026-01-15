import { sendPasswordResetEmailJSServer } from './emailjs-service';

/**
 * Send password reset email
 * Uses EmailJS REST API for server-side email sending
 */
export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  try {
    // Use EmailJS REST API (server-side)
    await sendPasswordResetEmailJSServer({
      toEmail: email,
      resetUrl,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Password Reset Email Sent via EmailJS:');
      console.log('To:', email);
      console.log('Reset Link:', resetUrl);
      console.log('Expires in: 15 minutes');
    }
  } catch (error) {
    console.error('Failed to send reset password email:', error);
    // Re-throw to allow API route to handle the error
    throw error;
  }
}

