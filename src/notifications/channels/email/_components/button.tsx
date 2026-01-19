import { Button as EmailButton, Section } from '@react-email/components';
import { styles } from './styles';

export interface ButtonProps {
  /** Button text */
  children?: string;
  /** Link URL */
  href?: string;
}

/**
 * Styled button component for email CTAs
 */
export default function Button({ children = 'Click here', href = '#' }: ButtonProps) {
  return (
    <Section style={styles.buttonContainer as React.CSSProperties}>
      <EmailButton href={href} style={styles.button}>
        {children}
      </EmailButton>
    </Section>
  );
}
