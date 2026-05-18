import { CompanyProfile } from './companyProfileService';

interface EmailTemplateData {
  companyProfile: CompanyProfile | null;
  subject: string;
  reportPeriod: string;
  clientName?: string;
  data: any[];
}

class EmailTemplateService {
  generateEmailHeader(branding: CompanyProfile | null): string {
    const primaryColor = branding?.primary_color || '#2563eb';
    const secondaryColor = branding?.secondary_color || '#1e40af';
    const companyName = branding?.company_name || 'Your Company';
    const brandName = branding?.brand_name || 'Site Engineer';
    const logoUrl = branding?.logo_url;

    return `
      <div style="background: linear-gradient(to right, ${primaryColor}, ${secondaryColor}); padding: 20px; text-align: center;">
        ${logoUrl ? `
          <img src="${logoUrl}" alt="${brandName}" style="height: 60px; margin-bottom: 10px;" />
        ` : `
          <div style="display: inline-block; background: white; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <h2 style="margin: 0; color: ${primaryColor}; font-size: 24px;">${brandName}</h2>
          </div>
        `}
        <h1 style="color: white; margin: 0; font-size: 28px;">${companyName}</h1>
      </div>
    `;
  }

  generateEmailFooter(branding: CompanyProfile | null): string {
    const primaryColor = branding?.primary_color || '#2563eb';
    const supportEmail = branding?.support_email || 'support@company.com';
    const contactNumber = branding?.contact_number || '+1 (555) 123-4567';
    const address = branding?.address || '123 Business Street, City, State 12345';
    const companyName = branding?.company_name || 'Your Company';

    return `
      <div style="background-color: #f8f9fa; padding: 20px; margin-top: 30px; border-top: 3px solid ${primaryColor};">
        <div style="text-align: center; color: #6c757d; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>${companyName}</strong></p>
          <p style="margin: 5px 0;">${address}</p>
          <p style="margin: 5px 0;">
            Email: <a href="mailto:${supportEmail}" style="color: ${primaryColor};">${supportEmail}</a> |
            Phone: ${contactNumber}
          </p>
          <p style="margin: 15px 0 5px 0; font-size: 12px; color: #adb5bd;">
            This is an automated report. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }

  generateDailyReportEmail(templateData: EmailTemplateData): string {
    const { companyProfile, subject, reportPeriod, clientName, data } = templateData;
    const primaryColor = companyProfile?.primary_color || '#2563eb';

    const tableRows = data.map(item => `
      <tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 12px; text-align: left;">${item.engineerName}</td>
        <td style="padding: 12px; text-align: left;">${item.designation || '-'}</td>
        <td style="padding: 12px; text-align: center;">
          <span style="
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            ${item.status === 'Present' ? 'background-color: #d4edda; color: #155724;' : ''}
            ${item.status === 'Absent' ? 'background-color: #f8d7da; color: #721c24;' : ''}
            ${item.status === 'Leave' ? 'background-color: #fff3cd; color: #856404;' : ''}
          ">
            ${item.status}
          </span>
        </td>
        <td style="padding: 12px; text-align: center;">${item.checkInTime || '-'}</td>
        <td style="padding: 12px; text-align: left;">${item.location || '-'}</td>
        <td style="padding: 12px; text-align: left;">${item.workSummary || '-'}</td>
        <td style="padding: 12px; text-align: left;">${item.backupEngineer || '-'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 900px; margin: 0 auto; background-color: white;">
          ${this.generateEmailHeader(companyProfile)}

          <div style="padding: 30px;">
            <h2 style="color: ${primaryColor}; margin-top: 0;">${subject}</h2>
            ${clientName ? `<h3 style="color: #495057; margin-bottom: 10px;">Client: ${clientName}</h3>` : ''}
            <p style="color: #6c757d; margin-bottom: 20px;">Report Period: ${reportPeriod}</p>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                  <tr style="background-color: ${primaryColor}; color: white;">
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Engineer</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Designation</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600;">Check-in</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Location</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Work Summary</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600;">Backup</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows || '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #6c757d;">No data available for this period.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          ${this.generateEmailFooter(companyProfile)}
        </div>
      </body>
      </html>
    `;
  }

  generateWeeklyReportEmail(templateData: EmailTemplateData): string {
    return this.generateDailyReportEmail({
      ...templateData,
      subject: templateData.subject.replace('Daily', 'Weekly'),
    });
  }

  generateMonthlyReportEmail(templateData: EmailTemplateData): string {
    return this.generateDailyReportEmail({
      ...templateData,
      subject: templateData.subject.replace('Daily', 'Monthly'),
    });
  }
}

export const emailTemplateService = new EmailTemplateService();
