import { Heading, Img, Section } from '@react-email/components';
import { styles } from './styles';

export interface HeaderProps {
  /** Application name to display */
  appName?: string;
  /** Optional logo URL */
  logoUrl?: string;
}

/**
 * Email header component with optional logo and app name
 */
export default function Header({ appName = 'NestJS Foundation', logoUrl }: HeaderProps) {
  return (
    <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
      {logoUrl && (
        <Img src={logoUrl} alt={appName} width="48" height="48" style={{ margin: '0 auto 16px' }} />
      )}
      <Heading as="h2" style={{ ...styles.text, fontWeight: '600', margin: 0 }}>
        {appName}
      </Heading>
    </Section>
  );
}
