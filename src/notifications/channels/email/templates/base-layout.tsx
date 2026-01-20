import { Body, Container, Head, Html, Preview } from '@react-email/components';
import type { ReactNode } from 'react';
import { styles } from '../_components';
import Footer from '../_components/footer';
import Header from '../_components/header';

export interface BaseLayoutProps {
  /** Application name */
  appName?: string;
  /** Preview text shown in email clients */
  previewText?: string;
  /** Email content */
  children?: ReactNode;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional support email for footer */
  supportEmail?: string;
  /** Optional language code for accessibility (default: "en") */
  language?: string;
}

/**
 * Base layout for all email templates.
 * Provides consistent structure with header, content area, and footer.
 */
export default function BaseLayout({
  appName = 'NestJS Foundation',
  previewText = 'Email from NestJS Foundation',
  children,
  logoUrl,
  supportEmail,
  language = 'en',
}: BaseLayoutProps) {
  return (
    <Html lang={language}>
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
}
