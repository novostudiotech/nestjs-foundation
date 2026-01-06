import { Heading, Text } from '@react-email/components';
import type { FC } from 'react';
import { Button, styles } from '../_components';
import { BaseLayout } from './base-layout';

export interface WelcomeEmailProps {
  /** User's display name (optional) */
  userName?: string;
  /** Application name */
  appName: string;
  /** URL to the dashboard or getting started page */
  dashboardUrl?: string;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional support email */
  supportEmail?: string;
}

/**
 * Welcome email template sent after successful registration.
 */
export const WelcomeEmail: FC<WelcomeEmailProps> = ({
  userName,
  appName,
  dashboardUrl,
  logoUrl,
  supportEmail,
}) => {
  const greeting = userName ? `Hi ${userName}` : 'Hi there';

  return (
    <BaseLayout
      appName={appName}
      previewText={`Welcome to ${appName}!`}
      logoUrl={logoUrl}
      supportEmail={supportEmail}
    >
      <Heading style={styles.heading}>Welcome to {appName}!</Heading>

      <Text style={styles.text}>
        {greeting}, thanks for signing up! We're excited to have you on board.
      </Text>

      <Text style={styles.text}>
        Your account has been created successfully and you're ready to get started.
      </Text>

      {dashboardUrl && <Button href={dashboardUrl}>Get Started</Button>}

      <Text style={styles.textMuted as React.CSSProperties}>
        If you have any questions or need help getting started, don't hesitate to reach out to our
        support team.
      </Text>
    </BaseLayout>
  );
};
