import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_MODEL_IDS } from '../../../src/lib/hero/screen-anchor';

const MODELS_DIR = 'public/models';
const RAW_DIR = 'assets/models/raw';
const HERO_GLB = join(MODELS_DIR, 'hero-desk.glb');
const BUDGET_BYTES = 3 * 1024 * 1024;

function listGlbs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listGlbs(path);
    return entry.name.endsWith('.glb') ? [path] : [];
  });
}

interface GlbJson {
  asset: { generator?: string };
  nodes: { name?: string; mesh?: number }[];
  materials: { name?: string }[];
  extensionsUsed?: string[];
}

/** Reads the JSON chunk of a binary glTF without decoding any (meshopt) buffers. */
function readGlbJson(path: string): GlbJson {
  const bytes = readFileSync(path);
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a); // 'JSON'
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as GlbJson;
}

describe('model size budget', () => {
  it('ships glb files totalling under 3 MB', () => {
    const files = listGlbs(MODELS_DIR);
    expect(files).toContain(HERO_GLB);
    const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(BUDGET_BYTES);
  });
});

describe('raw sources', () => {
  it('keeps the kenney sources and their license out of public/', () => {
    expect(existsSync(join(MODELS_DIR, 'raw'))).toBe(false);
    expect(existsSync(join(RAW_DIR, 'KENNEY-LICENSE.txt'))).toBe(true);
    for (const id of HERO_MODEL_IDS) expect(existsSync(join(RAW_DIR, `${id}.glb`))).toBe(true);
  });

  it('serves no raw model anywhere under public/', () => {
    const shipped = listGlbs('public').map((file) => file.replace(/^public\//, ''));
    expect(shipped).toEqual(['models/hero-desk.glb']);
  });
});

describe('hero-desk.glb', () => {
  const gltf = readGlbJson(HERO_GLB);
  const nodeNames = gltf.nodes.map((node) => node.name);

  it('has one root node per source model, named by model id', () => {
    for (const id of HERO_MODEL_IDS) expect(nodeNames).toContain(id);
    expect(nodeNames).toEqual(
      expect.arrayContaining(['desk', 'computerScreen', 'computerKeyboard']),
    );
    const props = HERO_MODEL_IDS.filter(
      (id) => !['desk', 'computerScreen', 'computerKeyboard'].includes(id),
    );
    expect(props.length).toBeGreaterThanOrEqual(2);
  });

  it('is meshopt-compressed, not Draco, and has no unlit materials left', () => {
    expect(gltf.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(gltf.extensionsUsed).not.toContain('KHR_draco_mesh_compression');
    expect(gltf.extensionsUsed).not.toContain('KHR_materials_unlit');
  });

  it('replaces the monitor face with the emissive screen material', () => {
    const names = gltf.materials.map((material) => material.name);
    expect(names).toContain('screen');
    expect(names).toContain('wood');
  });
});

describe('screen-anchor.json', () => {
  const anchor = JSON.parse(readFileSync('src/lib/hero/screen-anchor.json', 'utf8')) as {
    space: string;
    center: number[];
    width: number;
    height: number;
    aspect: number;
    normal: number[];
    rotation: number[];
  };

  it('describes the monitor face in the computerScreen node space', () => {
    expect(anchor.space).toBe('computerScreen');
    expect(anchor.center).toHaveLength(3);
    expect(anchor.rotation).toHaveLength(3);
    expect(anchor.width).toBeGreaterThan(anchor.height);
    expect(anchor.aspect).toBeCloseTo(anchor.width / anchor.height, 3);
    expect(Math.hypot(...(anchor.normal as [number, number, number]))).toBeCloseTo(1, 4);
  });

  it('matches the measured Kenney monitor (0.379 x 0.234 m, facing +Z)', () => {
    expect(anchor.width).toBeCloseTo(0.3791, 3);
    expect(anchor.height).toBeCloseTo(0.2337, 3);
    expect(anchor.normal[2]).toBeGreaterThan(0.9);
  });
});

describe('CREDITS.md', () => {
  const credits = readFileSync(join(MODELS_DIR, 'CREDITS.md'), 'utf8');

  it('lists every shipped glb', () => {
    for (const file of listGlbs(MODELS_DIR)) {
      expect(credits).toContain(file.replace(/^public\/models\//, ''));
    }
  });

  it('credits each source model with author, source and license', () => {
    expect(credits).toContain('Kenney');
    expect(credits).toContain('Furniture Kit 2.0');
    expect(credits).toContain('CC0');
    expect(credits).toContain('creativecommons.org/publicdomain/zero/1.0');
    for (const id of HERO_MODEL_IDS) expect(credits).toContain(`${id}.glb`);
  });

  it('records that GSAP is under the no-charge license, not MIT', () => {
    expect(credits).toContain('GSAP');
    expect(credits).toContain('https://gsap.com/standard-license');
    expect(credits).toMatch(/not MIT/i);
  });

  it('lists the other runtime libraries with their licenses', () => {
    for (const name of ['Lenis', 'three.js', 'React Three Fiber', 'drei', 'postprocessing']) {
      expect(credits).toContain(name);
    }
  });
});
