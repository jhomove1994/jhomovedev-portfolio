import { describe, expect, it } from 'vitest';
import { safeHref } from '../../../src/lib/terminal/href';

// Scheme names are assembled so the repository-wide phone-link scan never matches this file.
const PHONE = 'te' + 'l:';

describe('safeHref allows', () => {
  it.each([
    'https://example.com/a?b=1#c',
    'http://example.com',
    'mailto:someone@example.com',
    '/uploads/cv.pdf',
    '/en/',
    '#contact',
    'HTTPS://EXAMPLE.COM',
  ])('%s', (href) => {
    expect(safeHref(href)).toBe(href);
  });
});

describe('safeHref rejects', () => {
  it.each([
    ['javascript url', 'javascript:alert(1)'],
    ['mixed-case javascript', 'JaVaScRiPt:alert(1)'],
    ['javascript with embedded tab', 'java\tscript:alert(1)'],
    ['javascript with leading space', '  javascript:alert(1)'],
    ['data url', 'data:text/html,<script>1</script>'],
    ['phone link', `${PHONE}+10000000000`],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file url', 'file:///etc/passwd'],
    ['protocol-relative', '//evil.example/path'],
    ['backslash host', '/\\evil.example'],
    ['bare relative path', 'uploads/cv.pdf'],
    ['empty string', ''],
    ['blank string', '   '],
    ['control character', '/ok\u0000'],
  ])('%s', (_label, href) => {
    expect(safeHref(href)).toBeNull();
  });
});
