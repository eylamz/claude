import nodemailer from 'nodemailer';

// Only create transporter if SMTP is configured
let transporter: nodemailer.Transporter | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
} else if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️  SMTP not configured. Emails will not be sent. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.');
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!transporter) {
    const errorMsg = 'Email transporter not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!process.env.SMTP_FROM) {
    throw new Error('SMTP_FROM environment variable is required');
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

