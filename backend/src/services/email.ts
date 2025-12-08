import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Load email configuration from environment variables
function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Please check your .env file.');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const config = getEmailConfig();

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return transporter;
}

export async function sendEmail(params: SendEmailParams & { attachments?: any[] }): Promise<void> {
  const config = getEmailConfig();
  const emailTransporter = getTransporter();

  const mailOptions: any = {
    from: params.from || config.auth.user,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };

  if (params.attachments) {
    mailOptions.attachments = params.attachments;
  }

  try {
    await emailTransporter.sendMail(mailOptions);
  } catch (error: any) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendSigningLinkEmail(
  recipientEmail: string,
  recipientName: string,
  signingUrl: string
): Promise<void> {
  const subject = 'Digital Signature Request';
  
  // Use absolute URL for logo - email clients need fully qualified URLs
  const baseUrl = process.env.BASE_URL || 'https://sign.process-innovation.it';
  const logoSrc = `${baseUrl}/images/logo.png`;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      border: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 20px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .link-box {
      background-color: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      word-break: break-all;
      color: #2563eb;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoSrc}" alt="Thai Heavens" class="logo" width="200" height="auto" style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border: 0;" />
      <h1 style="color: #2563eb; margin-top: 0;">Digital Signature Request</h1>
    </div>
    
    <p>Hello ${recipientName},</p>
    
    <p>You have been sent a request to digitally sign a document.</p>
    
    <p style="text-align: center;">
      <a href="${signingUrl}" class="button">Sign Document</a>
    </p>
    
    <p>Or copy and paste this link into your browser:</p>
    <div class="link-box">${signingUrl}</div>
    
    <div class="footer">
      <p>This email was automatically generated. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
  });
  
  console.log('Email sent successfully to:', recipientEmail);
}

