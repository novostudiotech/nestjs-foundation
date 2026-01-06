import { render as renderReactEmail } from '@react-email/components';
import type { ReactElement } from 'react';

/**
 * Render a React Email component to HTML string
 *
 * @param element - React element to render (email template)
 * @returns Object containing HTML and plain text versions
 */
export async function renderEmailTemplate(
  element: ReactElement
): Promise<{ html: string; text: string }> {
  const html = await renderReactEmail(element);
  const text = await renderReactEmail(element, { plainText: true });

  return { html, text };
}
