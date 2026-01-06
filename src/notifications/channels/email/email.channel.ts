import { Injectable } from '@nestjs/common';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import type { NotificationChannel } from '#/notifications/channels/channel.interface';
import {
  NotificationType,
  type OtpPayload,
  type SendResult,
  type WelcomePayload,
} from '#/notifications/notifications.types';
import { EmailService } from './email.service';
import { EMAIL_SUBJECTS } from './email.types';
import { renderEmailTemplate } from './render';
import { OtpCodeEmail, WelcomeEmail } from './templates';

/**
 * Email notification channel using Resend and React Email.
 *
 * This channel encapsulates all email-specific logic including:
 * - Template selection and rendering
 * - Subject line generation
 * - Resend API integration
 *
 * Templates are TSX components located in ./templates/
 * and can be customized by editing those files directly.
 */
@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly name = 'email';

  readonly supportedTypes = [
    NotificationType.OTP_SIGN_IN,
    NotificationType.OTP_EMAIL_VERIFICATION,
    NotificationType.OTP_PASSWORD_RESET,
    NotificationType.WELCOME,
  ];

  constructor(private readonly emailService: EmailService) {}

  /**
   * Check if the email channel is properly configured
   */
  isConfigured(): boolean {
    return this.emailService.isConfigured();
  }

  /**
   * Send a notification via email
   */
  async send(type: NotificationType, payload: unknown): Promise<SendResult> {
    if (!this.supportedTypes.includes(type)) {
      return {
        success: false,
        error: `Email channel does not support notification type: ${type}`,
      };
    }

    const config = this.emailService.getConfig();
    const template = this.getTemplate(type, payload, config.appName);

    if (!template) {
      return {
        success: false,
        error: `No template found for notification type: ${type}`,
      };
    }

    const { html, text } = await renderEmailTemplate(template);
    const subject = this.getSubject(type, config.appName);
    const recipient = this.getRecipient(payload);

    if (!recipient) {
      return {
        success: false,
        error: 'No recipient email found in payload',
      };
    }

    const result = await this.emailService.send({
      to: recipient,
      subject,
      html,
      text,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Get the appropriate template for a notification type
   */
  private getTemplate(
    type: NotificationType,
    payload: unknown,
    appName: string
  ): ReactElement | null {
    switch (type) {
      case NotificationType.OTP_SIGN_IN:
        return this.createOtpTemplate(payload as OtpPayload, 'sign-in', appName);

      case NotificationType.OTP_EMAIL_VERIFICATION:
        return this.createOtpTemplate(payload as OtpPayload, 'email-verification', appName);

      case NotificationType.OTP_PASSWORD_RESET:
        return this.createOtpTemplate(payload as OtpPayload, 'password-reset', appName);

      case NotificationType.WELCOME:
        return this.createWelcomeTemplate(payload as WelcomePayload, appName);

      default:
        return null;
    }
  }

  /**
   * Create OTP email template
   */
  private createOtpTemplate(
    payload: OtpPayload,
    otpType: 'sign-in' | 'email-verification' | 'password-reset',
    appName: string
  ): ReactElement {
    return createElement(OtpCodeEmail, {
      otp: payload.otp,
      expiresInMinutes: payload.expiresInMinutes,
      appName,
      otpType,
    });
  }

  /**
   * Create welcome email template
   */
  private createWelcomeTemplate(payload: WelcomePayload, appName: string): ReactElement {
    return createElement(WelcomeEmail, {
      userName: payload.userName,
      appName,
    });
  }

  /**
   * Get subject line for a notification type
   */
  private getSubject(type: NotificationType, appName: string): string {
    const template = EMAIL_SUBJECTS[type];
    return template.replace('{appName}', appName);
  }

  /**
   * Extract recipient email from payload
   */
  private getRecipient(payload: unknown): string | undefined {
    if (typeof payload === 'object' && payload !== null && 'recipient' in payload) {
      return (payload as { recipient: string }).recipient;
    }
    return undefined;
  }
}
