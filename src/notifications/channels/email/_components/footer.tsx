import { Hr, Section, Text } from '@react-email/components';
import { styles } from './styles';

export interface FooterProps {
  /** Application name */
  appName?: string;
  /** Optional support email */
  supportEmail?: string;
}

/**
 * Email footer component with copyright and optional support link
 */
export default function Footer({ appName = 'NestJS Foundation', supportEmail }: FooterProps) {
  return (
    <>
      <Hr style={styles.divider} />
      <Section style={styles.footer as React.CSSProperties}>
        <Text style={{ margin: 0 }}>
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </Text>
        {supportEmail && (
          <Text style={{ margin: '8px 0 0' }}>
            Questions? Contact us at{' '}
            <a href={`mailto:${supportEmail}`} style={styles.link}>
              {supportEmail}
            </a>
          </Text>
        )}
        <Text style={{ margin: '8px 0 0', color: '#aaa' }}>
          This is an automated message. Please do not reply directly to this email.
        </Text>
      </Section>
    </>
  );
}
