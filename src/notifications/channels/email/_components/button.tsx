import { Button as EmailButton, Section } from '@react-email/components';
import type { FC } from 'react';
import { styles } from './styles';

export interface ButtonProps {
  /** Button text */
  children: string;
  /** Link URL */
  href: string;
}

/**
 * Styled button component for email CTAs
 */
export const Button: FC<ButtonProps> = ({ children, href }) => (
  <Section style={styles.buttonContainer as React.CSSProperties}>
    <EmailButton href={href} style={styles.button}>
      {children}
    </EmailButton>
  </Section>
);
