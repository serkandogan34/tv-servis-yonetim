// Email Notification System
import { SystemLogger } from './logger';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationEvent {
  type: 'payment_approved' | 'payment_rejected' | 'credit_loaded' | 'job_purchased' | 'system_alert';
  recipient: {
    email: string;
    name: string;
    type: 'bayi' | 'admin';
  };
  data: Record<string, any>;
}

export class NotificationService {
  private static emailService: 'resend' | 'sendgrid' | 'mailgun' = 'resend'; // Default to Resend
  
  // Email templates
  private static templates: Record<string, (data: any) => EmailTemplate> = {
    payment_approved: (data) => ({
      subject: `✅ Transfer Onaylandı - ${data.amount} TL`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>🎉 Transfer Onaylandı!</h1>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <p>Sayın <strong>${data.bayiName}</strong>,</p>
            
            <p>Göndermiş olduğunuz <strong>${data.amount} TL</strong> tutarındaki havale transferiniz başarıyla onaylanmıştır.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Transfer Detayları:</h3>
              <ul>
                <li><strong>Tutar:</strong> ${data.amount} TL</li>
                <li><strong>Referans:</strong> ${data.reference}</li>
                <li><strong>Onay Tarihi:</strong> ${data.approvalDate}</li>
                <li><strong>Yeni Bakiye:</strong> ${data.newBalance} TL</li>
              </ul>
            </div>
            
            ${data.adminNote ? `
              <div style="background: #e0f2fe; padding: 10px; border-radius: 8px;">
                <strong>Admin Notu:</strong> ${data.adminNote}
              </div>
            ` : ''}
            
            <p>Kredi bakiyeniz güncellenmiştir. Artık sistemde iş satın alabilirsiniz.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.bayiPanelUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Bayi Paneline Git
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
            </p>
          </div>
        </div>
      `,
      text: `Transfer Onaylandı!\n\nSayın ${data.bayiName},\n\n${data.amount} TL tutarındaki transferiniz onaylanmıştır.\nYeni bakiyeniz: ${data.newBalance} TL\n\nBayi Paneli: ${data.bayiPanelUrl}`
    }),

    payment_rejected: (data) => ({
      subject: `❌ Transfer Reddedildi - ${data.amount} TL`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>❌ Transfer Reddedildi</h1>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <p>Sayın <strong>${data.bayiName}</strong>,</p>
            
            <p>Göndermiş olduğunuz <strong>${data.amount} TL</strong> tutarındaki havale transferiniz reddedilmiştir.</p>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>Red Nedeni:</h3>
              <p>${data.rejectionReason || 'Belirtilmedi'}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Transfer Detayları:</h3>
              <ul>
                <li><strong>Tutar:</strong> ${data.amount} TL</li>
                <li><strong>Referans:</strong> ${data.reference}</li>
                <li><strong>Red Tarihi:</strong> ${data.rejectionDate}</li>
              </ul>
            </div>
            
            <p>Lütfen transfer bilgilerinizi kontrol ederek yeniden gönderebilirsiniz.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.bayiPanelUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Bayi Paneline Git
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Transfer Reddedildi\n\n${data.amount} TL tutarındaki transferiniz reddedilmiştir.\nNeden: ${data.rejectionReason}`
    }),

    credit_loaded: (data) => ({
      subject: `💳 Kredi Yüklendi - ${data.amount} TL`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #059669; color: white; padding: 20px; text-align: center;">
            <h1>💳 Kredi Yüklendi!</h1>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <p>Sayın <strong>${data.bayiName}</strong>,</p>
            
            <p><strong>${data.amount} TL</strong> tutarında kredi hesabınıza başarıyla yüklenmiştir.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>İşlem Detayları:</h3>
              <ul>
                <li><strong>Yüklenen Tutar:</strong> ${data.amount} TL</li>
                <li><strong>Ödeme Yöntemi:</strong> ${data.paymentMethod}</li>
                <li><strong>İşlem Tarihi:</strong> ${data.transactionDate}</li>
                <li><strong>Yeni Bakiye:</strong> ${data.newBalance} TL</li>
              </ul>
            </div>
            
            <p>Artık sistemdeki işleri satın alabilirsiniz!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.bayiPanelUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                İşlere Gözat
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Kredi Yüklendi!\n\n${data.amount} TL hesabınıza yüklenmiştir.\nYeni bakiyeniz: ${data.newBalance} TL`
    }),

    system_alert: (data) => ({
      subject: `🚨 Sistem Uyarısı: ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>🚨 Sistem Uyarısı</h1>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <h2>${data.title}</h2>
            <p>${data.message}</p>
            
            ${data.details ? `
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <pre style="white-space: pre-wrap;">${JSON.stringify(data.details, null, 2)}</pre>
              </div>
            ` : ''}
            
            <p><strong>Zaman:</strong> ${data.timestamp}</p>
          </div>
        </div>
      `,
      text: `Sistem Uyarısı: ${data.title}\n\n${data.message}\n\nZaman: ${data.timestamp}`
    })
  };

  // Send notification based on event type
  static async sendNotification(event: NotificationEvent): Promise<boolean> {
    try {
      const template = this.templates[event.type];
      if (!template) {
        SystemLogger.error('Notification', `Unknown notification type: ${event.type}`);
        return false;
      }

      const emailContent = template(event.data);
      
      SystemLogger.info('Notification', `Sending ${event.type} notification`, {
        recipient: event.recipient.email,
        subject: emailContent.subject
      });

      // In production, integrate with actual email service
      const success = await this.sendEmail(
        event.recipient.email,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );

      if (success) {
        SystemLogger.info('Notification', 'Email sent successfully', {
          type: event.type,
          recipient: event.recipient.email
        });
      } else {
        SystemLogger.error('Notification', 'Email sending failed', {
          type: event.type,
          recipient: event.recipient.email
        });
      }

      return success;
      
    } catch (error) {
      SystemLogger.error('Notification', 'Notification sending error', {
        error: error.message,
        event: event.type,
        recipient: event.recipient.email
      });
      return false;
    }
  }

  // Email service integration (mock for now)
  private static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      // Mock implementation - in production integrate with:
      // - Resend API
      // - SendGrid API  
      // - Mailgun API
      // - CloudFlare Email Workers

      SystemLogger.info('Email', 'Mock email sending', {
        to,
        subject,
        html: html.substring(0, 100) + '...'
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate 95% success rate
      return Math.random() > 0.05;
      
    } catch (error) {
      SystemLogger.error('Email', 'Email service error', { error: error.message });
      return false;
    }
  }

  // Batch notification sending
  static async sendBatchNotifications(events: NotificationEvent[]): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;

    for (const event of events) {
      const result = await this.sendNotification(event);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    SystemLogger.info('Notification', 'Batch notification completed', { success, failed });
    return { success, failed };
  }

  // Helper functions for common notifications
  static async notifyPaymentApproval(bayi: any, payment: any, adminNote?: string): Promise<boolean> {
    return await this.sendNotification({
      type: 'payment_approved',
      recipient: {
        email: bayi.email || bayi.login_email,
        name: bayi.firma_adi,
        type: 'bayi'
      },
      data: {
        bayiName: bayi.firma_adi,
        amount: payment.tutar,
        reference: payment.havale_referans,
        approvalDate: new Date().toLocaleDateString('tr-TR'),
        newBalance: (bayi.kredi_bakiye || bayi.kredi_bakiyesi || 0) + payment.tutar,
        adminNote: adminNote,
        bayiPanelUrl: 'https://tvservis.com/bayi'
      }
    });
  }

  static async notifyPaymentRejection(bayi: any, payment: any, reason: string): Promise<boolean> {
    return await this.sendNotification({
      type: 'payment_rejected',
      recipient: {
        email: bayi.email || bayi.login_email,
        name: bayi.firma_adi,
        type: 'bayi'
      },
      data: {
        bayiName: bayi.firma_adi,
        amount: payment.tutar,
        reference: payment.havale_referans,
        rejectionDate: new Date().toLocaleDateString('tr-TR'),
        rejectionReason: reason,
        bayiPanelUrl: 'https://tvservis.com/bayi'
      }
    });
  }

  static async notifyCreditLoaded(bayi: any, amount: number, paymentMethod: string): Promise<boolean> {
    return await this.sendNotification({
      type: 'credit_loaded',
      recipient: {
        email: bayi.email || bayi.login_email,
        name: bayi.firma_adi,
        type: 'bayi'
      },
      data: {
        bayiName: bayi.firma_adi,
        amount: amount,
        paymentMethod: paymentMethod,
        transactionDate: new Date().toLocaleDateString('tr-TR'),
        newBalance: bayi.kredi_bakiye || bayi.kredi_bakiyesi || 0,
        bayiPanelUrl: 'https://tvservis.com/bayi'
      }
    });
  }
}