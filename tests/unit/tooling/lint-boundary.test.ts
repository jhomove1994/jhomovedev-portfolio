import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function messages(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2);
}

describe('pure-core import boundary (src/lib/**)', () => {
  it.each([
    ['src/lib/terminal/x.ts', "import { useState } from 'react';\nexport const a = useState;\n"],
    ['src/lib/terminal/x.ts', "import { x } from 'astro:content';\nexport const a = x;\n"],
    [
      'src/lib/terminal/x.ts',
      "import { createRoot } from 'react-dom/client';\nexport const a = createRoot;\n",
    ],
    ['src/lib/hero/x.ts', "import { Vector3 } from 'three';\nexport const a = Vector3;\n"],
    [
      'src/lib/hero/x.ts',
      "import { Canvas } from '@react-three/fiber';\nexport const a = Canvas;\n",
    ],
    ['src/lib/hero/x.ts', "import gsap from 'gsap';\nexport const a = gsap;\n"],
    ['src/lib/hero/x.ts', "import Lenis from 'lenis';\nexport const a = Lenis;\n"],
  ])('rejects forbidden imports in %s', async (filePath, code) => {
    const errors = await messages(filePath, code);
    expect(errors.map((m) => m.ruleId)).toContain('no-restricted-imports');
  });

  it('still allows astro:* in the single queries module', async () => {
    const errors = await messages(
      'src/lib/content/queries.ts',
      "import { getCollection } from 'astro:content';\nexport const a = getCollection;\n",
    );
    expect(errors).toEqual([]);
  });

  it('allows plain relative imports inside the pure core', async () => {
    const errors = await messages(
      'src/lib/terminal/x.ts',
      "import { y } from './y';\nexport const a = y;\n",
    );
    expect(errors.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });
});

describe('lazy-3d import boundary (hero and terminal components)', () => {
  it.each(['three', 'gsap', 'lenis', 'postprocessing', '@react-three/drei'])(
    'rejects a static value import of %s in src/components/hero',
    async (pkg) => {
      const errors = await messages(
        'src/components/hero/x.tsx',
        `import * as lib from '${pkg}';\nexport const a = lib;\n`,
      );
      expect(errors.map((m) => m.ruleId)).toContain('@typescript-eslint/no-restricted-imports');
    },
  );

  it('rejects a static value import of three in src/components/terminal', async () => {
    const errors = await messages(
      'src/components/terminal/x.tsx',
      "import { Vector3 } from 'three';\nexport const a = Vector3;\n",
    );
    expect(errors.map((m) => m.ruleId)).toContain('@typescript-eslint/no-restricted-imports');
  });

  it('allows a dynamic import() of the heavy libraries', async () => {
    const errors = await messages(
      'src/components/hero/x.tsx',
      "export const load = () => import('three');\nexport const loadGsap = () => import('gsap');\n",
    );
    expect(errors).toEqual([]);
  });

  it('allows import type of the heavy libraries', async () => {
    const errors = await messages(
      'src/components/hero/x.tsx',
      "import type { Vector3 } from 'three';\nexport type V = Vector3;\n",
    );
    expect(errors).toEqual([]);
  });

  it('does not restrict the lazy 3d chunk itself', async () => {
    const errors = await messages(
      'src/components/three/x.tsx',
      "import { Vector3 } from 'three';\nexport const a = Vector3;\n",
    );
    expect(errors).toEqual([]);
  });
});

describe('react-hooks rules on tsx', () => {
  it('flags a hook called conditionally', async () => {
    const errors = await messages(
      'src/components/hero/x.tsx',
      "import { useState } from 'react';\nexport function C({ on }: { on: boolean }) {\n  if (on) {\n    useState(0);\n  }\n  return null;\n}\n",
    );
    expect(errors.map((m) => m.ruleId)).toContain('react-hooks/rules-of-hooks');
  });
});
