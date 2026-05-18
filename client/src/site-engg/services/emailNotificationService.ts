export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailNotificationService {
  private async sendEmail(notification: EmailNotification): Promise<boolean> {
    return true;
  }

  async notifyCheckIn(
    engineerName: string,
    clientName: string,
    clientEmail: string,
    checkInData: {
      location: string;
      status: string;
      date: string;
      time: string;
      notes?: string;
    }
  ): Promise<boolean> {
    const subject = `Check-In Update: ${engineerName} at ${clientName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Engineer Check-In Notification</h2>
            </div>
            <div class="content">
              <p>Dear ${clientName} Team,</p>
              <p>This is to inform you that <strong>${engineerName}</strong> has checked in.</p>

              <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">${checkInData.date}</span>
              </div>

              <div class="info-row">
                <span class="label">Time:</span>
                <span class="value">${checkInData.time}</span>
              </div>

              <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${checkInData.location}</span>
              </div>

              <div class="info-row">
                <span class="label">Status:</span>
                <span class="value">${checkInData.status}</span>
              </div>

              ${checkInData.notes ? `
              <div class="info-row">
                <span class="label">Notes:</span>
                <span class="value">${checkInData.notes}</span>
              </div>
              ` : ''}

              <p style="margin-top: 20px;">This is an automated notification from the Engineer Management System.</p>
            </div>
            <div class="footer">
              <p>Engineer Management System | Automated Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: [clientEmail],
      subject,
      html,
      text: `Check-In Update: ${engineerName} has checked in at ${checkInData.location} on ${checkInData.date} at ${checkInData.time}. Status: ${checkInData.status}`,
    });
  }

  async notifyDailyReport(
    engineerName: string,
    clientName: string,
    clientEmail: string,
    reportData: {
      date: string;
      workDescription: string;
      hoursWorked: number;
      issuesFaced?: string;
      materialsUsed?: string;
    }
  ): Promise<boolean> {
    const subject = `Daily Report: ${engineerName} - ${reportData.date}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-row { margin: 15px 0; padding: 15px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #1f2937; display: block; margin-bottom: 5px; }
            .value { color: #4b5563; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Daily Work Report</h2>
            </div>
            <div class="content">
              <p>Dear ${clientName} Team,</p>
              <p>Please find the daily work report from <strong>${engineerName}</strong>.</p>

              <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">${reportData.date}</span>
              </div>

              <div class="info-row">
                <span class="label">Hours Worked:</span>
                <span class="value">${reportData.hoursWorked} hours</span>
              </div>

              <div class="info-row">
                <span class="label">Work Description:</span>
                <div class="value" style="white-space: pre-wrap;">${reportData.workDescription}</div>
              </div>

              ${reportData.materialsUsed ? `
              <div class="info-row">
                <span class="label">Materials Used:</span>
                <div class="value" style="white-space: pre-wrap;">${reportData.materialsUsed}</div>
              </div>
              ` : ''}

              ${reportData.issuesFaced ? `
              <div class="info-row">
                <span class="label">Issues/Challenges:</span>
                <div class="value" style="white-space: pre-wrap;">${reportData.issuesFaced}</div>
              </div>
              ` : ''}

              <p style="margin-top: 20px;">For any questions or concerns, please contact the engineer directly.</p>
            </div>
            <div class="footer">
              <p>Engineer Management System | Daily Report Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: [clientEmail],
      subject,
      html,
      text: `Daily Report from ${engineerName} (${reportData.date}): ${reportData.workDescription}. Hours worked: ${reportData.hoursWorked}.`,
    });
  }

  async notifyLeaveRequest(
    engineerName: string,
    clientName: string,
    clientEmail: string,
    leaveData: {
      startDate: string;
      endDate: string;
      type: string;
      reason?: string;
      status: string;
    }
  ): Promise<boolean> {
    const subject = `Leave Request: ${engineerName} - ${leaveData.startDate} to ${leaveData.endDate}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Leave Request Notification</h2>
            </div>
            <div class="content">
              <p>Dear ${clientName} Team,</p>
              <p>This is to inform you about a leave request from <strong>${engineerName}</strong>.</p>

              <div class="info-row">
                <span class="label">Leave Type:</span>
                <span class="value">${leaveData.type}</span>
              </div>

              <div class="info-row">
                <span class="label">Start Date:</span>
                <span class="value">${leaveData.startDate}</span>
              </div>

              <div class="info-row">
                <span class="label">End Date:</span>
                <span class="value">${leaveData.endDate}</span>
              </div>

              ${leaveData.reason ? `
              <div class="info-row">
                <span class="label">Reason:</span>
                <span class="value">${leaveData.reason}</span>
              </div>
              ` : ''}

              <div class="info-row">
                <span class="label">Status:</span>
                <span class="status status-${leaveData.status.toLowerCase()}">${leaveData.status}</span>
              </div>

              <p style="margin-top: 20px;">Please plan accordingly for this period.</p>
            </div>
            <div class="footer">
              <p>Engineer Management System | Leave Request Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: [clientEmail],
      subject,
      html,
      text: `Leave Request: ${engineerName} has requested ${leaveData.type} from ${leaveData.startDate} to ${leaveData.endDate}. Status: ${leaveData.status}`,
    });
  }

  async notifyMultipleClients(
    engineerName: string,
    clientEmails: string[],
    subject: string,
    message: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">${subject}</h2>
            </div>
            <div class="content">
              <p>Dear Client,</p>
              <div style="white-space: pre-wrap;">${message}</div>
              <p style="margin-top: 20px;"><strong>From:</strong> ${engineerName}</p>
            </div>
            <div class="footer">
              <p>Engineer Management System | Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmails,
      subject,
      html,
      text: `${subject}\n\n${message}\n\nFrom: ${engineerName}`,
    });
  }
}

export const emailNotificationService = new EmailNotificationService();
