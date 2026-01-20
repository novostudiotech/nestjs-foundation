import { betterAuth } from 'better-auth';
import { emailOTP, openAPI } from 'better-auth/plugins';
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';
import { getTrustedOrigins } from '#/app/cors';

/**
 * OTP type from Better Auth emailOTP plugin
 */
export type BetterAuthOtpType = 'sign-in' | 'email-verification' | 'forget-password';

/**
 * Callback function for sending OTP emails
 */
export type SendOtpCallback = (params: {
  email: string;
  otp: string;
  type: BetterAuthOtpType;
}) => Promise<void>;

/**
 * Better Auth configuration options
 */
export interface BetterAuthConfigOptions {
  databaseUrl: string;
  secret: string;
  /**
   * Optional callback to send OTP emails.
   * If not provided, OTP sending will be disabled (logs a warning).
   */
  sendOtp?: SendOtpCallback;
  /**
   * OTP expiration time in seconds (default: 300 = 5 minutes)
   */
  otpExpiresIn?: number;
}

/**
 * Creates and returns a Better Auth instance
 * @param options - Configuration options containing databaseUrl, secret, and optional sendOtp callback
 * @returns Better Auth instance
 */
export function getBetterAuthConfig({
  databaseUrl,
  secret,
  sendOtp,
  otpExpiresIn = 300,
}: BetterAuthConfigOptions) {
  const trustedOrigins = getTrustedOrigins(process.env.CORS_ORIGINS);
  const isTest = process.env.NODE_ENV === 'test';

  return betterAuth({
    database: new Pool({
      connectionString: databaseUrl,
    }),
    secret,
    basePath: '/auth',
    trustedOrigins,
    hooks: {}, // minimum required to use hook decorators
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !isTest, // Disable email verification in test environment
    },
    plugins: [
      openAPI({ disableDefaultReference: true }),
      emailOTP({
        otpLength: 6,
        expiresIn: otpExpiresIn,
        sendVerificationOnSignUp: !isTest, // Don't send OTP emails in test environment
        async sendVerificationOTP({ email, otp, type }) {
          if (sendOtp) {
            // Don't await to avoid timing attacks (as recommended by Better Auth docs)
            sendOtp({ email, otp, type }).catch((error) => {
              console.error(`Failed to send OTP email to ${email}:`, error);
            });
          } else {
            // Only log OTP in development (never in production for security)
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[DEV] OTP for ${email}: ${otp} (sendOtp callback not configured)`);
            } else {
              console.warn(`OTP requested for ${email} but sendOtp callback not configured`);
            }
          }
        },
      }),
    ],
    user: {
      modelName: 'user',
    },
    session: {
      modelName: 'session',
    },
    account: {
      modelName: 'account',
    },
    verification: {
      modelName: 'verification',
    },
    advanced: {
      database: {
        generateId: () => uuidv7(),
      },
    },
  });
}
