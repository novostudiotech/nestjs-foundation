import { Module } from '@nestjs/common';
import { NOTIFICATION_CHANNELS } from '#/notifications/channels/channel.interface';
import { EmailChannel } from '#/notifications/channels/email/email.channel';
import { EmailModule } from '#/notifications/channels/email/email.module';
import { NotificationsService } from '#/notifications/notifications.service';

/**
 * NotificationsModule - Unified notification delivery system
 *
 * This module provides a channel-agnostic way to send notifications.
 * Currently supports:
 * - Email (via Resend + React Email)
 *
 * Future channels can be added by:
 * 1. Creating a new channel module in channels/
 * 2. Implementing NotificationChannel interface
 * 3. Adding the channel to NOTIFICATION_CHANNELS provider
 *
 * @example
 * ```typescript
 * // In any service
 * constructor(private notifications: NotificationsService) {}
 *
 * async sendOtp(email: string, otp: string) {
 *   await this.notifications.send(NotificationType.OTP_SIGN_IN, {
 *     recipient: email,
 *     otp,
 *     expiresInMinutes: 5,
 *   });
 * }
 * ```
 */
@Module({
  imports: [EmailModule],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (emailChannel: EmailChannel) => {
        // Add more channels here as they are implemented
        // e.g., [emailChannel, pushChannel, smsChannel]
        return [emailChannel];
      },
      inject: [EmailChannel],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
