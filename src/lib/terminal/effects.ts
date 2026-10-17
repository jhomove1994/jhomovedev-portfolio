// Carries out the UI effects a command returned. The browser operations are injected so the
// routing and the link policy stay testable without a DOM.
import { safeHref } from './href';
import type { Effect } from './types';

export interface EffectPorts {
  navigate(href: string): void;
  download(href: string): void;
  scroll(section: 'experience' | 'contact'): void;
}

export function runEffects(effects: readonly Effect[], ports: EffectPorts): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'scroll':
        ports.scroll(effect.section);
        break;
      case 'navigate': {
        const href = safeHref(effect.href);
        if (href !== null) ports.navigate(href);
        break;
      }
      case 'download': {
        const href = safeHref(effect.href);
        if (href !== null) ports.download(href);
        break;
      }
      case 'clear':
        // The session already emptied the transcript when it produced this effect.
        break;
    }
  }
}
