import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '#/app/config';
import type { EmailConfig, EmailSendResult, SendEmailOptions } from './email.types';

/**
 * Email service wrapping the Resend SDK.
 *
 * Handles:
 * - Resend client initialization
 * - Email sending with error handling
 * - Configuration management
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly config: EmailConfig;

  constructor(configService: ConfigService<EnvConfig>) {
    const apiKey = configService.get('RESEND_API_KEY') ?? '';
    const fromEmail = configService.get('EMAIL_FROM') ?? '';
    const replyTo = configService.get('EMAIL_REPLY_TO');
    const appName = configService.get('APP_NAME') ?? 'Our App';

    this.config = {
      apiKey,
      fromEmail,
      replyTo,
      appName,
    };

    // Initialize Resend client only if API key is provided
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized with Resend');
    } else {
      this.resend = null;
      this.logger.warn('Email service not configured: RESEND_API_KEY not set');
    }
  }

  /**
   * Check if the email service is properly configured
   */
  isConfigured(): boolean {
    return this.resend !== null && this.config.fromEmail !== '';
  }

  /**
   * Get the current email configuration
   */
  getConfig(): Omit<EmailConfig, 'apiKey'> {
    return {
      fromEmail: this.config.fromEmail,
      replyTo: this.config.replyTo,
      appName: this.config.appName,
    };
  }

  /**
   * Send an email via Resend
   */
  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    if (!this.resend) {
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    if (!this.config.fromEmail) {
      return {
        success: false,
        error: 'EMAIL_FROM not configured',
      };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.config.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo ?? this.config.replyTo,
      });

      if (error) {
        // Mask email for privacy (show only first char and domain)
        const maskedEmail = this.maskEmail(options.to);
        this.logger.error(`Failed to send email to ${maskedEmail}: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.debug(`Email sent successfully (id: ${data?.id})`);
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const maskedEmail = this.maskEmail(options.to);
      this.logger.error(`Error sending email to ${maskedEmail}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Mask email address for privacy in logs (GDPR/CCPA compliance)
   * Example: user@example.com -> u***@example.com
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }
}
