import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationChannel } from '#/notifications/channels/channel.interface';
import { NOTIFICATION_CHANNELS } from '#/notifications/channels/channel.interface';
import type {
  NotificationPayloadMap,
  NotificationType,
  SendResult,
} from '#/notifications/notifications.types';

/**
 * Options for sending notifications
 */
export interface SendNotificationOptions {
  /**
   * Preferred channels to use (in order of preference).
   * If not specified, the first available channel supporting the type will be used.
   */
  preferredChannels?: string[];
}

/**
 * Orchestrates notification delivery across multiple channels.
 *
 * This service:
 * - Routes notifications to appropriate channels based on type
 * - Handles channel selection logic (preferred vs available)
 * - Provides a unified API for sending any notification type
 *
 * @example
 * ```typescript
 * // Send OTP via email (default channel)
 * await notificationsService.send(NotificationType.OTP_SIGN_IN, {
 *   recipient: 'user@example.com',
 *   otp: '123456',
 *   expiresInMinutes: 5,
 * });
 *
 * // Send with preferred channel
 * await notificationsService.send(NotificationType.WELCOME, payload, {
 *   preferredChannels: ['push', 'email'],
 * });
 * ```
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[]
  ) {}

  /**
   * Send a notification through the appropriate channel
   *
   * @param type - The type of notification to send
   * @param payload - The notification payload (must match the type)
   * @param options - Optional send options
   * @returns Promise resolving to the send result
   * @throws Error if no configured channel supports the notification type
   */
  async send<T extends NotificationType>(
    type: T,
    payload: NotificationPayloadMap[T],
    options?: SendNotificationOptions
  ): Promise<SendResult> {
    const channel = this.resolveChannel(type, options?.preferredChannels);

    if (!channel) {
      const error = `No configured channel available for notification type: ${type}`;
      this.logger.error(error);
      return { success: false, error };
    }

    if (!channel.isConfigured()) {
      const error = `Channel "${channel.name}" is not properly configured`;
      this.logger.error(error);
      return { success: false, error };
    }

    this.logger.debug(`Sending ${type} notification via ${channel.name} channel`);

    try {
      const result = await channel.send(type, payload);

      if (result.success) {
        this.logger.debug(
          `Successfully sent ${type} notification via ${channel.name} (messageId: ${result.messageId})`
        );
      } else {
        this.logger.warn(
          `Failed to send ${type} notification via ${channel.name}: ${result.error}`
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending ${type} notification via ${channel.name}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all available channels for a notification type
   */
  getAvailableChannels(type: NotificationType): NotificationChannel[] {
    return this.channels.filter(
      (channel) => channel.supportedTypes.includes(type) && channel.isConfigured()
    );
  }

  /**
   * Resolve which channel to use for a notification
   */
  private resolveChannel(
    type: NotificationType,
    preferredChannels?: string[]
  ): NotificationChannel | undefined {
    const availableChannels = this.getAvailableChannels(type);

    if (availableChannels.length === 0) {
      return undefined;
    }

    // If preferred channels specified, try them in order
    if (preferredChannels && preferredChannels.length > 0) {
      for (const preferredName of preferredChannels) {
        const channel = availableChannels.find((c) => c.name === preferredName);
        if (channel) {
          return channel;
        }
      }
    }

    // Fall back to first available channel
    return availableChannels[0];
  }
}
