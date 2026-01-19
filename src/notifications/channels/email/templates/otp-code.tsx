import { Heading, Section, Text } from '@react-email/components';
import { styles } from '../_components';
import BaseLayout from './base-layout';

export interface OtpCodeEmailProps {
  /** The one-time password code */
  otp?: string;
  /** Number of minutes until the OTP expires */
  expiresInMinutes?: number;
  /** Application name */
  appName?: string;
  /** Type of OTP for customized messaging */
  otpType?: 'sign-in' | 'email-verification' | 'password-reset';
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional support email */
  supportEmail?: string;
}

const OTP_MESSAGES = {
  'sign-in': {
    heading: 'Sign in to your account',
    instruction: 'Enter this code to sign in:',
    preview: 'Your sign-in verification code',
  },
  'email-verification': {
    heading: 'Verify your email address',
    instruction: 'Enter this code to verify your email:',
    preview: 'Your email verification code',
  },
  'password-reset': {
    heading: 'Reset your password',
    instruction: 'Enter this code to reset your password:',
    preview: 'Your password reset code',
  },
};

/**
 * OTP code email template.
 * Used for sign-in, email verification, and password reset flows.
 */
export default function OtpCodeEmail({
  otp = '123456',
  expiresInMinutes = 10,
  appName = 'NestJS Foundation',
  otpType = 'sign-in',
  logoUrl,
  supportEmail,
}: OtpCodeEmailProps) {
  const messages = OTP_MESSAGES[otpType];

  return (
    <BaseLayout
      appName={appName}
      previewText={`${messages.preview}: ${otp}`}
      logoUrl={logoUrl}
      supportEmail={supportEmail}
    >
      <Heading style={styles.heading}>{messages.heading}</Heading>

      <Text style={styles.text}>{messages.instruction}</Text>

      <Section style={styles.codeContainer as React.CSSProperties}>
        <Text style={styles.code}>{otp}</Text>
      </Section>

      <Text style={styles.textMuted as React.CSSProperties}>
        This code will expire in {expiresInMinutes} {expiresInMinutes === 1 ? 'minute' : 'minutes'}.
      </Text>

      <Text style={styles.textMuted as React.CSSProperties}>
        If you didn't request this code, you can safely ignore this email. Someone may have entered
        your email address by mistake.
      </Text>
    </BaseLayout>
  );
}
