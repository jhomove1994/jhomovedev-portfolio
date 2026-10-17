// Server-render contract of the terminal (no-JS and pre-hydration markup). Interactive behavior
// (keyboard, clicks, focus) needs a browser and is covered by the Playwright specs of PR6/PR7.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Terminal } from '../../../src/components/terminal/Terminal';
import { createTerminalSession } from '../../../src/lib/terminal/session';
import { labelsFor, makeData } from './fixtures';

function render(locale: 'en' | 'es' = 'en', submit?: string): string {
  const data = makeData(locale);
  const labels = labelsFor(locale);
  const session = createTerminalSession(data, labels);
  if (submit !== undefined) session.submit(submit);
  return renderToStaticMarkup(createElement(Terminal, { session, data, labels }));
}

describe('Terminal server markup', () => {
  it('prints the intro transcript inside a polite, named log', () => {
    const html = render();
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-relevant="additions"');
    expect(html).toContain(`aria-label="${labelsFor('en').logLabel}"`);
    expect(html).toContain('Fixture whoami text');
    expect(html).toContain('data-lenis-prevent');
  });

  it('localizes the accessible names', () => {
    expect(render('es')).toContain(`aria-label="${labelsFor('es').logLabel}"`);
    expect(render('es')).toContain(`aria-label="${labelsFor('es').windowsLabel}"`);
  });

  it('renders no input and no buttons before hydration', () => {
    const html = render();
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<button');
  });

  it('keeps the tmux windows as plain text with the active one marked', () => {
    const html = render();
    expect(html).toContain('<nav');
    expect(html).toContain('1:whoami*');
    expect(html).toContain('aria-current="true"');
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });

  it('numbers the gutter and shows the nvim statusline', () => {
    const html = render();
    expect(html).toContain('NORMAL');
    expect(html).toContain('~/whoami.md');
    expect(html).toContain('utf-8 en 3:1');
  });

  it('follows the session: a command moves the active window and the file name', () => {
    const html = render('en', 'stack');
    expect(html).toContain('4:stack*');
    expect(html).toContain('~/stack.md');
    expect(html).not.toContain('1:whoami*');
  });

  it('never renders a phone link or inline script', () => {
    const html = render('en', 'contact');
    expect(html).not.toMatch(/href="tel/);
    expect(html).not.toContain('<script');
  });

  it('renders anchors only for links that pass the link policy', () => {
    const html = render('en', 'certs');
    expect(html).toContain('href="https://example.com/c1"');
    expect(html).not.toContain('javascript:');
  });
});
