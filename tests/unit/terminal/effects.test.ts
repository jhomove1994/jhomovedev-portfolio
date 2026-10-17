import { describe, expect, it } from 'vitest';
import { runEffects, type EffectPorts } from '../../../src/lib/terminal/effects';
import type { Effect } from '../../../src/lib/terminal/types';

function recorder(): { calls: string[]; ports: EffectPorts } {
  const calls: string[] = [];
  return {
    calls,
    ports: {
      navigate: (href) => calls.push(`navigate ${href}`),
      download: (href) => calls.push(`download ${href}`),
      scroll: (section) => calls.push(`scroll ${section}`),
    },
  };
}

describe('runEffects', () => {
  it('routes each effect to its port, in order', () => {
    const { calls, ports } = recorder();
    const effects: Effect[] = [
      { kind: 'scroll', section: 'experience' },
      { kind: 'download', href: '/uploads/cv-en.pdf' },
      { kind: 'navigate', href: '/es/' },
      { kind: 'scroll', section: 'contact' },
    ];
    runEffects(effects, ports);
    expect(calls).toEqual([
      'scroll experience',
      'download /uploads/cv-en.pdf',
      'navigate /es/',
      'scroll contact',
    ]);
  });

  it('treats clear as already applied by the session', () => {
    const { calls, ports } = recorder();
    runEffects([{ kind: 'clear' }], ports);
    expect(calls).toEqual([]);
  });

  it('refuses navigation and download targets that fail the link policy', () => {
    const { calls, ports } = recorder();
    runEffects(
      [
        { kind: 'navigate', href: 'javascript:alert(1)' },
        { kind: 'download', href: 'data:text/html,x' },
        { kind: 'navigate', href: '/en/' },
      ],
      ports,
    );
    expect(calls).toEqual(['navigate /en/']);
  });
});
