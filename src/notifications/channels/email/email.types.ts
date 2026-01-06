import type { NotificationType } from '#/notifications/notifications.types';

/**
 * Configuration for the email channel
 */
export interface EmailConfig {
  /** Resend API key */
  apiKey: string;
  /** Default sender email address */
  fromEmail: string;
  /** Optional reply-to email address */
  replyTo?: string;
  /** Application name used in email templates */
  appName: string;
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Optional plain text version */
  text?: string;
  /** Optional reply-to address (overrides default) */
  replyTo?: string;
}

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Subject lines for each notification type
 */
export const EMAIL_SUBJECTS: Record<NotificationType, string> = {
  otp_sign_in: 'Your sign-in code',
  otp_email_verification: 'Verify your email address',
  otp_password_reset: 'Reset your password',
  welcome: 'Welcome to {appName}!',
};
