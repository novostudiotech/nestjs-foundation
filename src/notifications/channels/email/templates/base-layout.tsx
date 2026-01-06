import { Body, Container, Head, Html, Preview } from '@react-email/components';
import type { FC, ReactNode } from 'react';
import { Footer, Header, styles } from '../_components';

export interface BaseLayoutProps {
  /** Application name */
  appName: string;
  /** Preview text shown in email clients */
  previewText: string;
  /** Email content */
  children: ReactNode;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional support email for footer */
  supportEmail?: string;
}

/**
 * Base layout for all email templates.
 * Provides consistent structure with header, content area, and footer.
 */
export const BaseLayout: FC<BaseLayoutProps> = ({
  appName,
  previewText,
  children,
  logoUrl,
  supportEmail,
}) => (
  <Html>
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Header appName={appName} logoUrl={logoUrl} />
        {children}
        <Footer appName={appName} supportEmail={supportEmail} />
      </Container>
    </Body>
  </Html>
);
