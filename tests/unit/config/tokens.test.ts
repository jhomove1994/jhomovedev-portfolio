import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../helpers/contrast';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const globalCss = readFileSync('src/styles/global.css', 'utf8');

function token(name: string): string | undefined {
  return tokens.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();
}

describe('design tokens (REQUERIMIENTOS section 6)', () => {
  it('pins the base palette', () => {
    expect(token('color-bg')?.toUpperCase()).toBe('#0A0E0D');
    expect(token('color-accent')?.toUpperCase()).toBe('#3DDC97');
  });

  it.each(['surface', 'border', 'text', 'muted', 'accent-soft', 'warn'])(
    'defines the %s colour as a hex or rgba value',
    (name) => {
      expect(token(`color-${name}`)).toMatch(/^(#[0-9a-f]{3,8}|rgba?\(.+\))$/i);
    },
  );

  it('defines the three font stacks with self-hosted families and fallbacks', () => {
    expect(token('font-display')).toMatch(/^'Space Grotesk Variable'.*sans-serif$/);
    expect(token('font-sans')).toMatch(/^'IBM Plex Sans Variable'.*sans-serif$/);
    expect(token('font-mono')).toMatch(/^'JetBrains Mono Variable'.*monospace$/);
  });

  it('defines the 1.25 type scale 17/21/27/33/42/52 px', () => {
    const sizes = ['base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((n) => token(`text-${n}`));
    expect(sizes).toEqual(['17px', '21px', '27px', '33px', '42px', '52px']);
  });

  it('caps reading lines at 68ch', () => {
    expect(token('measure')).toBe('68ch');
    expect(globalCss).toContain('var(--measure)');
  });
});

describe('terminal tokens (design AD16)', () => {
  const expected: Record<string, string> = {
    'term-bg': '#14100D',
    'term-bar': '#241B14',
    'term-line': '#3A2C20',
    'term-fg': '#EADFCB',
    'term-muted': '#9C8A73',
    'term-amber': '#E3A857',
    'term-rust': '#D9785A',
  };

  it.each(Object.entries(expected))('pins --color-%s to %s', (name, hex) => {
    expect(token(`color-${name}`)?.toUpperCase()).toBe(hex);
  });

  it('keeps the accent out of the warm terminal palette', () => {
    const accent = token('color-accent')?.toLowerCase();
    for (const name of Object.keys(expected)) {
      expect(token(`color-${name}`)?.toLowerCase()).not.toBe(accent);
    }
  });

  it('defines the sticky header height used by the hero stage', () => {
    expect(token('header-h')).toBe('4rem');
  });

  const color = (name: string) => token(`color-${name}`)!;
  it.each([
    ['term-fg', 'term-bg', 4.5],
    ['term-muted', 'term-bg', 5],
    ['term-amber', 'term-bg', 4.5],
    ['term-rust', 'term-bg', 4.5],
    ['term-fg', 'term-bar', 4.5],
    ['term-accent-check', 'term-bg', 4.5],
  ])('%s on %s meets WCAG AA (>= %s:1)', (fg, bg, minimum) => {
    const foreground = fg === 'term-accent-check' ? color('accent') : color(fg);
    expect(contrastRatio(foreground, color(bg))).toBeGreaterThanOrEqual(minimum);
  });
});

describe('contrast helper', () => {
  it('returns 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3ddc97', '#3ddc97')).toBeCloseTo(1, 5);
  });

  it('is symmetric and rejects malformed colours', () => {
    expect(contrastRatio('#14100d', '#eadfcb')).toBeCloseTo(contrastRatio('#eadfcb', '#14100d'), 8);
    expect(() => contrastRatio('red', '#fff')).toThrow(/#rrggbb/);
  });
});

describe('global styles', () => {
  it('imports Tailwind, the tokens and the three self-hosted font packages', () => {
    expect(globalCss).toMatch(/@import\s+("|')tailwindcss\1/);
    expect(globalCss).toContain('tokens.css');
    for (const pkg of ['space-grotesk', 'ibm-plex-sans', 'jetbrains-mono']) {
      expect(globalCss).toContain(`@fontsource-variable/${pkg}`);
    }
  });

  it('respects prefers-reduced-motion and shows a visible focus ring', () => {
    expect(globalCss).toContain('prefers-reduced-motion');
    expect(globalCss).toContain(':focus-visible');
  });

  it('does not use the Matrix-style glow beyond a subtle bloom', () => {
    expect(globalCss).not.toMatch(/text-shadow\s*:[^;]*\b(\d{2,})px/);
  });
});
