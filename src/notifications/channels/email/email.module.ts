import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailChannel } from './email.channel';
import { EmailService } from './email.service';

/**
 * Email channel module for the notifications system.
 *
 * Provides:
 * - EmailService: Resend SDK wrapper
 * - EmailChannel: NotificationChannel implementation
 *
 * Configuration via environment variables:
 * - RESEND_API_KEY: Resend API key (required for sending)
 * - EMAIL_FROM: Default sender email address (required)
 * - EMAIL_REPLY_TO: Optional reply-to address
 * - APP_NAME: Application name used in templates
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailChannel],
  exports: [EmailChannel, EmailService],
})
export class EmailModule {}
