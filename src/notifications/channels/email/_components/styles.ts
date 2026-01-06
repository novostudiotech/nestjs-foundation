import type { CSSProperties } from 'react';

/**
 * Shared styles for email templates
 * Using inline styles as email clients have limited CSS support
 */
export const styles = {
  // Layout
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    margin: 0,
    padding: 0,
  } satisfies CSSProperties,

  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '40px',
    maxWidth: '560px',
  } satisfies CSSProperties,

  // Typography
  heading: {
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 24px',
    textAlign: 'center',
  } satisfies CSSProperties,

  text: {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 16px',
  } satisfies CSSProperties,

  textMuted: {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 16px',
  } satisfies CSSProperties,

  textCenter: {
    textAlign: 'center',
  } satisfies CSSProperties,

  // OTP Code
  codeContainer: {
    backgroundColor: '#f4f4f5',
    borderRadius: '8px',
    margin: '24px 0',
    padding: '24px',
    textAlign: 'center',
  } satisfies CSSProperties,

  code: {
    color: '#1a1a1a',
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '4px',
    margin: 0,
  } satisfies CSSProperties,

  // Button
  buttonContainer: {
    textAlign: 'center',
    margin: '32px 0',
  } satisfies CSSProperties,

  button: {
    backgroundColor: '#0070f3',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 32px',
    textDecoration: 'none',
  } satisfies CSSProperties,

  // Divider
  divider: {
    borderColor: '#e6e6e6',
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0',
    margin: '32px 0',
  } satisfies CSSProperties,

  // Footer
  footer: {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '32px 0 0',
    textAlign: 'center',
  } satisfies CSSProperties,

  link: {
    color: '#0070f3',
    textDecoration: 'none',
  } satisfies CSSProperties,
} as const;
