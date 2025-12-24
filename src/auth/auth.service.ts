import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvConfig } from '../config';
import { UserEntity } from './entities/user.entity';

/**
 * NOTE: This service is for handling auth related tasks outside of Better Auth.
 * You cannot import better auth instance from `better-auth.service.ts` here since we already use this service to create Better Auth instance and will cause a circular loop.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Simple in-memory rate limiting (can be replaced with Redis later)
  private readonly rateLimitMap = new Map<string, number>();

  constructor(
    private configService: ConfigService<EnvConfig>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async sendSigninMagicLink({ email, url }: { email: string; url: string }) {
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Rate limited to 1 email per 30 seconds
    const cacheKey = `SignInMagicLinkMailLastSentAt:${user.id}`;
    const lastSent = this.rateLimitMap.get(cacheKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 30_000) {
      const remainingSeconds = Math.floor((30_000 - (now - lastSent)) / 1000);
      throw new HttpException(
        `Too many requests. Please wait ${remainingSeconds} seconds before sending again.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // TODO: Implement actual email sending
    this.logger.log(`Magic link for ${email}: ${url}`);
    this.rateLimitMap.set(cacheKey, now);
  }

  async verifyEmail({ url, userId }: { url: string; userId: string }) {
    // Rate limited to 1 email per 30 seconds
    const cacheKey = `EmailVerificationMailLastSentAt:${userId}`;
    const lastSent = this.rateLimitMap.get(cacheKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 30_000) {
      const remainingSeconds = Math.floor((30_000 - (now - lastSent)) / 1000);
      throw new HttpException(
        `Too many requests. Please wait ${remainingSeconds} seconds before sending again.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // TODO: Implement actual email sending
    this.logger.log(`Email verification for user ${userId}: ${url}`);
    this.rateLimitMap.set(cacheKey, now);
  }

  async resetPassword({ url, userId }: { url: string; userId: string }) {
    // Rate limited to 1 email per 30 seconds
    const cacheKey = `ResetPasswordMailLastSentAt:${userId}`;
    const lastSent = this.rateLimitMap.get(cacheKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 30_000) {
      const remainingSeconds = Math.floor((30_000 - (now - lastSent)) / 1000);
      throw new HttpException(
        `Too many requests. Please wait ${remainingSeconds} seconds before sending again.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // TODO: Implement actual email sending
    this.logger.log(`Password reset for user ${userId}: ${url}`);
    this.rateLimitMap.set(cacheKey, now);
  }
}
