/**
 * Base email template component
 * Provides responsive HTML structure with inline CSS
 */

interface BaseEmailTemplateProps {
  title: string;
  preheader?: string;
  children: string;
  primaryButton?: {
    text: string;
    url: string;
  };
  footerNote?: string;
}

export function getBaseEmailHTML({
  title,
  preheader,
  children,
  primaryButton,
  footerNote,
}: BaseEmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333333;">
  <!-- Preheader -->
  ${preheader ? `<div style="display: none; font-size: 1px; color: #f5f5f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; border-spacing: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">ENBOSS</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">${title}</h2>
              
              ${children}
              
              ${primaryButton ? `
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${primaryButton.url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">${primaryButton.text}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              ${footerNote ? `<p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">${footerNote}</p>` : ''}
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} ENBOSS. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="https://enboss.co" style="color: #2563eb; text-decoration: none;">Visit our website</a> | 
                <a href="mailto:support@enboss.co" style="color: #2563eb; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Product item row for order emails
 */
export function getProductRowHTML(product: {
  image: string;
  name: string;
  quantity: number;
  price: number;
}): string {
  return `
<table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <tr>
    <td style="padding: 0;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 80px; padding-right: 15px; vertical-align: top;">
            <img src="${product.image}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;" />
          </td>
          <td style="vertical-align: top; padding: 0;">
            <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${product.name}</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Quantity: ${product.quantity}</p>
            <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">₪${product.price.toFixed(2)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim();
}


