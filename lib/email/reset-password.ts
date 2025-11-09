/**
 * Email transporter configuration (commented out for development)
 * Uncomment and configure in production
 */
// import nodemailer from 'nodemailer';
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port: Number(process.env.SMTP_PORT) || 587,
//   secure: process.env.SMTP_SECURE === 'true',
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

/**
 * Send password reset email
 */
export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  // In production, use a proper email service
  // For now, log the reset link
  console.log('Password Reset Email:');
  console.log('To:', email);
  console.log('Reset Link:', resetUrl);

  // Uncomment to send actual email
  /*
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Request</h1>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                You requested to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. The reset link will expire in 1 hour.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                This is an automated message, please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
        Password Reset Request

        You requested to reset your password. Click the link below to create a new password:

        ${resetUrl}

        If you didn't request a password reset, you can safely ignore this email. The reset link will expire in 1 hour.

        This is an automated message, please do not reply to this email.
      `,
    });
  } catch (error) {
    console.error('Failed to send reset email:', error);
    throw error;
  }
  */
}

