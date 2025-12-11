// ============================================
// FILE: app/lib/email.server.ts
// ============================================
// This is a placeholder for email sending functionality
// You can integrate with services like:
// - Resend (https://resend.com)
// - SendGrid
// - AWS SES
// - Postmark

interface InvitationEmailParams {
  to: string;
  name: string;
  organizationName: string;
  inviterName: string;
  role: string;
  token: string;
}

export async function sendInvitationEmail(params: InvitationEmailParams) {
  const invitationUrl = `${process.env.APP_URL}/accept-invitation/${params.token}`;

  // TODO: Integrate with your email service
  // For now, just log the invitation details
  console.log("=".repeat(60));
  console.log("📧 INVITATION EMAIL");
  console.log("=".repeat(60));
  console.log(`To: ${params.to}`);
  console.log(`Name: ${params.name}`);
  console.log(`Organization: ${params.organizationName}`);
  console.log(`Role: ${params.role}`);
  console.log(`Invited by: ${params.inviterName}`);
  console.log(`Invitation URL: ${invitationUrl}`);
  console.log("=".repeat(60));

  // Example with Resend:
  /*
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'TimeTrack <invitations@yourdomain.com>',
    to: params.to,
    subject: `You've been invited to join ${params.organizationName}`,
    html: getInvitationEmailHTML(params, invitationUrl),
  });
  */

  return { success: true };
}

function getInvitationEmailHTML(
  params: InvitationEmailParams, 
  invitationUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to ${params.organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: #F5D547; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: #37352F; font-size: 28px;">You've been invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #E9E9E7; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on TimeTrack as a <strong>${params.role}</strong>.
    </p>

    <div style="background: #FBFBFA; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #787774;">Your role:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #37352F; text-transform: capitalize;">${params.role}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" 
         style="display: inline-block; background: #F5D547; color: #37352F; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #787774; margin-top: 30px;">
      This invitation will expire in 7 days. If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #787774; word-break: break-all; background: #F5F5F5; padding: 10px; border-radius: 4px;">
      ${invitationUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #E9E9E7; margin: 30px 0;">

    <p style="font-size: 12px; color: #787774; margin: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #787774; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} TimeTrack. All rights reserved.</p>
  </div>

</body>
</html>
  `;
}

// ============================================
// INTEGRATION EXAMPLES
// ============================================

/*
// 1. RESEND (Recommended - Simple and Modern)
// npm install resend

import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(params: InvitationEmailParams) {
  const invitationUrl = `${process.env.APP_URL}/accept-invitation/${params.token}`;
  
  await resend.emails.send({
    from: 'TimeTrack <invitations@yourdomain.com>',
    to: params.to,
    subject: `You've been invited to join ${params.organizationName}`,
    html: getInvitationEmailHTML(params, invitationUrl),
  });
}

// 2. SENDGRID
// npm install @sendgrid/mail

import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendInvitationEmail(params: InvitationEmailParams) {
  const invitationUrl = `${process.env.APP_URL}/accept-invitation/${params.token}`;
  
  await sgMail.send({
    to: params.to,
    from: 'invitations@yourdomain.com',
    subject: `You've been invited to join ${params.organizationName}`,
    html: getInvitationEmailHTML(params, invitationUrl),
  });
}

// 3. AWS SES
// npm install @aws-sdk/client-ses

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
const sesClient = new SESClient({ region: "us-east-1" });

export async function sendInvitationEmail(params: InvitationEmailParams) {
  const invitationUrl = `${process.env.APP_URL}/accept-invitation/${params.token}`;
  
  const command = new SendEmailCommand({
    Source: "invitations@yourdomain.com",
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: `You've been invited to join ${params.organizationName}` },
      Body: { Html: { Data: getInvitationEmailHTML(params, invitationUrl) } },
    },
  });
  
  await sesClient.send(command);
}
*/