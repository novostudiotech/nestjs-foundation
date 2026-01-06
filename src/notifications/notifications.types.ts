/**
 * Types of notifications that can be sent through the system.
 * Each type maps to specific templates in each channel.
 */
export enum NotificationType {
  /** OTP code for sign-in authentication */
  OTP_SIGN_IN = 'otp_sign_in',
  /** OTP code for email verification */
  OTP_EMAIL_VERIFICATION = 'otp_email_verification',
  /** OTP code for password reset */
  OTP_PASSWORD_RESET = 'otp_password_reset',
  /** Welcome message after successful registration */
  WELCOME = 'welcome',
}

/**
 * Result of a notification send operation
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Base payload that all notifications must include
 */
export interface BaseNotificationPayload {
  /** Recipient identifier (email, device token, etc.) */
  recipient: string;
}

/**
 * Payload for OTP notifications
 */
export interface OtpPayload extends BaseNotificationPayload {
  otp: string;
  expiresInMinutes: number;
}

/**
 * Payload for welcome notifications
 */
export interface WelcomePayload extends BaseNotificationPayload {
  userName?: string;
}

/**
 * Map of notification types to their payload types
 */
export interface NotificationPayloadMap {
  [NotificationType.OTP_SIGN_IN]: OtpPayload;
  [NotificationType.OTP_EMAIL_VERIFICATION]: OtpPayload;
  [NotificationType.OTP_PASSWORD_RESET]: OtpPayload;
  [NotificationType.WELCOME]: WelcomePayload;
}
