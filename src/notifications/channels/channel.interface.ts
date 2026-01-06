import type { NotificationType, SendResult } from '#/notifications/notifications.types';

/**
 * Abstract interface for notification delivery channels.
 *
 * Each channel (email, push, SMS, etc.) implements this interface
 * and encapsulates its own templates, providers, and delivery logic.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class EmailChannel implements NotificationChannel {
 *   readonly name = 'email';
 *   readonly supportedTypes = [NotificationType.OTP_SIGN_IN, ...];
 *
 *   async send(type, payload) {
 *     const html = this.renderTemplate(type, payload);
 *     return this.emailService.send({ to: payload.recipient, html });
 *   }
 * }
 * ```
 */
export interface NotificationChannel {
  /**
   * Unique name identifier for this channel
   */
  readonly name: string;

  /**
   * List of notification types this channel supports
   */
  readonly supportedTypes: NotificationType[];

  /**
   * Send a notification through this channel
   *
   * @param type - The type of notification to send
   * @param payload - The notification payload (type depends on notification type)
   * @returns Promise resolving to the send result
   */
  send(type: NotificationType, payload: unknown): Promise<SendResult>;

  /**
   * Check if this channel is properly configured and ready to send
   *
   * @returns true if the channel can send notifications
   */
  isConfigured(): boolean;
}

/**
 * Injection token for notification channels
 */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
