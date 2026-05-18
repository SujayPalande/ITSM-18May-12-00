import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { TicketWithRelations } from '@shared/schema';

// Create email transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (!transporter) {
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            } : undefined,
            // For development/testing without real SMTP
            ...(process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST ? {
                streamTransport: true,
                newline: 'unix',
                buffer: true
            } : {})
        };

        transporter = nodemailer.createTransport(smtpConfig);
    }
    return transporter;
}

// Format date for emails
function formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get ticket ID formatted as TKT-0001
function getTicketId(id: number): string {
    return `TKT-${id.toString().padStart(4, '0')}`;
}

// Get app URL
function getAppUrl(): string {
    return process.env.APP_URL || 'http://localhost:5000';
}

// Email template for ticket creation
function getTicketCreatedEmailTemplate(ticket: TicketWithRelations): { subject: string; html: string } {
    const ticketId = getTicketId(ticket.id);
    const ticketUrl = `${getAppUrl()}/tickets/${ticket.id}`;

    const subject = `[ITSM] New Ticket Created - ${ticketId}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #4CAF50;">✓ Your Support Ticket Has Been Created</h2>
  </div>
  
  <p>Dear ${ticket.createdBy.name},</p>
  
  <p>Your support ticket has been successfully created. Our team will review it and get back to you shortly.</p>
  
  <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Ticket ID:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.description}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">
            ${ticket.status}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="color: ${ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#f59e0b' : '#16a34a'}; text-transform: capitalize; font-weight: bold;">
            ${ticket.priority}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.category?.name || 'N/A'}</td>
      </tr>
      ${ticket.subcategory ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subcategory:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.subcategory.name}</td>
      </tr>
      ` : ''}
      ${ticket.companyName ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.companyName}</td>
      </tr>
      ` : ''}
      ${ticket.location ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.location}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Support Type:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-transform: capitalize;">${ticket.supportType || 'remote'}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Created:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${formatDate(ticket.createdAt)}</td>
      </tr>
      ${ticket.assignedTo ? `
      <tr>
        <td style="padding: 12px 8px; font-weight: bold;">Assigned To:</td>
        <td style="padding: 12px 8px;">${ticket.assignedTo.name}</td>
      </tr>
      ` : ''}
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ticketUrl}" 
       style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      View Ticket Details
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <strong>Need help?</strong> Simply reply to this email or contact our support team.<br>
    This is an automated message from the ITSM Support System.
  </p>
  
  <p style="color: #666; font-size: 14px;">
    Best regards,<br>
    <strong>ITSM Support Team</strong>
  </p>
</body>
</html>
  `;

    return { subject, html };
}

// Email template for status change
function getStatusChangeEmailTemplate(
    ticket: TicketWithRelations,
    oldStatus: string,
    newStatus: string
): { subject: string; html: string } {
    const ticketId = getTicketId(ticket.id);
    const ticketUrl = `${getAppUrl()}/tickets/${ticket.id}`;

    const subject = `[ITSM] Ticket Status Updated - ${ticketId}`;

    const statusConfig = {
        'open': { color: '#dc2626', icon: '⚠️', label: 'Open' },
        'in_progress': { color: '#f59e0b', icon: '⏱️', label: 'In Progress' },
        'in-progress': { color: '#f59e0b', icon: '⏱️', label: 'In Progress' },
        'closed': { color: '#16a34a', icon: '✓', label: 'Closed' }
    };

    const oldConfig = statusConfig[oldStatus as keyof typeof statusConfig] || { color: '#666', icon: '', label: oldStatus };
    const newConfig = statusConfig[newStatus as keyof typeof statusConfig] || { color: '#666', icon: '', label: newStatus };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Status Updated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #2563eb;">📝 Your Ticket Status Has Been Updated</h2>
  </div>
  
  <p>Dear ${ticket.createdBy.name},</p>
  
  <p>The status of your support ticket has been updated by our team.</p>
  
  <div style="background-color: #f0f9ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <h3 style="margin: 0 0 15px 0; color: #1e40af;">Status Change</h3>
    <div style="display: inline-block;">
      <span style="background-color: ${oldConfig.color}20; color: ${oldConfig.color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px;">
        ${oldConfig.icon} ${oldConfig.label}
      </span>
      <span style="font-size: 24px; margin: 0 10px;">→</span>
      <span style="background-color: ${newConfig.color}20; color: ${newConfig.color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px;">
        ${newConfig.icon} ${newConfig.label}
      </span>
    </div>
  </div>
  
  <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Ticket ID:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.description}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="color: ${ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#f59e0b' : '#16a34a'}; text-transform: capitalize; font-weight: bold;">
            ${ticket.priority}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.category?.name || 'N/A'}</td>
      </tr>
      ${ticket.assignedTo ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Assigned To:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.assignedTo.name}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px 8px; font-weight: bold;">Updated:</td>
        <td style="padding: 12px 8px;">${formatDate(new Date())}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ticketUrl}" 
       style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      View Full Ticket Details
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <strong>Need help?</strong> Simply reply to this email or contact our support team.<br>
    This is an automated message from the ITSM Support System.
  </p>
  
  <p style="color: #666; font-size: 14px;">
    Best regards,<br>
    <strong>ITSM Support Team</strong>
  </p>
</body>
</html>
  `;

    return { subject, html };
}

// Send ticket created email
export async function sendTicketCreatedEmail(ticket: TicketWithRelations): Promise<void> {
    try {
        const recipientEmail = ticket.contactEmail || ticket.createdBy.email;

        if (!recipientEmail) {
            console.log('No email address found for ticket creator');
            return;
        }

        const { subject, html } = getTicketCreatedEmailTemplate(ticket);

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"ITSM Support" <noreply@localhost>',
            to: recipientEmail,
            subject,
            html
        };

        const transport = getTransporter();
        const info = await transport.sendMail(mailOptions);

        console.log(`✓ Ticket created email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
    } catch (error) {
        console.error('Failed to send ticket created email:', error);
        // Don't throw - email failure shouldn't break ticket creation
    }
}

// Send status change email
export async function sendStatusChangeEmail(
    ticket: TicketWithRelations,
    oldStatus: string,
    newStatus: string
): Promise<void> {
    try {
        // Only send email for meaningful status changes
        if (oldStatus === newStatus) {
            return;
        }

        // Only send for specific status changes (to in_progress or closed)
        if (newStatus !== 'in_progress' && newStatus !== 'in-progress' && newStatus !== 'closed') {
            console.log(`Skipping email for status change to ${newStatus}`);
            return;
        }

        const recipientEmail = ticket.contactEmail || ticket.createdBy.email;

        if (!recipientEmail) {
            console.log('No email address found for ticket creator');
            return;
        }

        const { subject, html } = getStatusChangeEmailTemplate(ticket, oldStatus, newStatus);

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"ITSM Support" <noreply@localhost>',
            to: recipientEmail,
            subject,
            html
        };

        const transport = getTransporter();
        const info = await transport.sendMail(mailOptions);

        console.log(`✓ Status change email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
    } catch (error) {
        console.error('Failed to send status change email:', error);
        // Don't throw - email failure shouldn't break ticket update
    }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
    try {
        const transport = getTransporter();
        await transport.verify();
        console.log('✓ Email configuration is valid');
        return true;
    } catch (error) {
        console.error('✗ Email configuration error:', error);
        return false;
    }
}
