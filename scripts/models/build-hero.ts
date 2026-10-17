/**
 * Builds public/models/hero-desk.glb from the 8 raw Kenney models (design AD7).
 *
 *   pnpm models:build
 *
 * Steps: read each raw GLB, replace KHR_materials_unlit with lit PBR materials from the
 * night-rustic palette, wrap each model under a root node named by its id, merge into one
 * scene, optimise, compress with Meshopt (no Draco: its decoder would load from a CDN) and
 * emit src/lib/hero/screen-anchor.json from the monitor face primitive.
 * Runs on Node type stripping (>=22.18): keep to erasable TypeScript syntax.
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Document, Logger, NodeIO, type Material, type Primitive } from '@gltf-transform/core';
import {
  KHRMaterialsEmissiveStrength,
  KHRONOS_EXTENSIONS,
  EXTMeshoptCompression,
} from '@gltf-transform/extensions';
import {
  dedup,
  getBounds,
  mergeDocuments,
  meshopt,
  prune,
  quantize,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import {
  emissiveParams,
  hexToLinear,
  linearToHex,
  resolveMaterial,
} from '../../src/lib/hero/palette.ts';
import {
  HERO_MODEL_IDS,
  computeScreenAnchor,
  isScreenQuad,
  type HeroModelId,
  type Vec3,
} from '../../src/lib/hero/screen-anchor.ts';

const RAW_DIR = 'assets/models/raw';
const OUT_GLB = 'public/models/hero-desk.glb';
const OUT_ANCHOR = 'src/lib/hero/screen-anchor.json';
const ROUND = 1e5;

const round = (v: number) => Math.round(v * ROUND) / ROUND;
const roundVec = (v: readonly number[]) => v.map(round);
const size3 = (min: readonly number[], max: readonly number[]) =>
  roundVec(max.map((m, i) => m - min[i]!));

async function main() {
  await MeshoptEncoder.ready;
  const logger = new Logger(Logger.Verbosity.WARN);
  const io = new NodeIO()
    .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
    .setLogger(logger);

  const target = new Document().setLogger(logger);
  const buffer = target.createBuffer('hero-desk');
  const scene = target.createScene('hero-desk');
  const unmapped: string[] = [];
  let anchorPositions: Vec3[] | null = null;

  for (const id of HERO_MODEL_IDS) {
    const source = await io.read(join(RAW_DIR, `${id}.glb`));
    const bounds = getBounds(source.getRoot().listScenes()[0]!);
    console.log(
      `${id}: size ${size3(bounds.min, bounds.max).join(' x ')} (min y ${round(bounds.min[1])}, max y ${round(bounds.max[1])})`,
    );

    for (const material of source.getRoot().listMaterials()) {
      const sourceName = material.getName();
      console.log(`  material ${sourceName} -> ${retint(id, material, source, unmapped)}`);
    }
    dropUnusedUvs(source);
    if (id === 'computerScreen') anchorPositions = readScreenQuad(source);
    for (const extension of source.getRoot().listExtensionsUsed()) {
      if (extension.extensionName === 'KHR_materials_unlit') extension.dispose();
    }

    const before = new Set(target.getRoot().listScenes());
    mergeDocuments(target, source);
    const root = target.createNode(id);
    for (const merged of target.getRoot().listScenes()) {
      if (before.has(merged)) continue;
      for (const child of merged.listChildren()) root.addChild(child);
      merged.dispose();
    }
    scene.addChild(root);
  }
  if (!anchorPositions) throw new Error('computerScreen model not found');

  // Every source brings its own buffer; a GLB may only have one.
  for (const accessor of target.getRoot().listAccessors()) accessor.setBuffer(buffer);
  for (const extra of target.getRoot().listBuffers()) if (extra !== buffer) extra.dispose();

  const anchor = computeScreenAnchor(anchorPositions);
  const facing = anchor.normal[2] >= 0 ? '+Z' : '-Z';
  console.log(
    `screen quad: center ${roundVec(anchor.center)} size ${round(anchor.width)} x ${round(anchor.height)} m, normal ${roundVec(anchor.normal)} (faces ${facing}), rotation ${roundVec(anchor.rotation)}`,
  );
  console.log(`unmapped materials (warm-retinted): ${unmapped.join(', ') || 'none'}`);

  await target.transform(
    dedup(),
    weld(),
    quantize(),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

  mkdirSync(dirname(OUT_GLB), { recursive: true });
  await io.write(OUT_GLB, target);
  writeFileSync(
    OUT_ANCHOR,
    `${JSON.stringify(
      {
        space: 'computerScreen',
        center: roundVec(anchor.center),
        width: round(anchor.width),
        height: round(anchor.height),
        aspect: round(anchor.aspect),
        normal: roundVec(anchor.normal),
        rotation: roundVec(anchor.rotation),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote ${OUT_GLB}: ${statSync(OUT_GLB).size} bytes; ${OUT_ANCHOR}`);
}

/** Replaces one unlit Kenney material by its lit palette entry, in place. Returns a log line. */
function retint(
  modelId: HeroModelId,
  material: Material,
  source: Document,
  unmapped: string[],
): string {
  const sourceName = material.getName();
  const sourceHex = linearToHex(
    material.getBaseColorFactor().slice(0, 3) as [number, number, number],
  );
  const { spec, mapped } = resolveMaterial(modelId, sourceName, sourceHex);
  if (!mapped) unmapped.push(`${modelId}:${sourceName}`);

  material.setExtension('KHR_materials_unlit', null);
  material.setName(spec.name);
  material.setBaseColorFactor([...hexToLinear(spec.color), 1]);
  material.setRoughnessFactor(spec.roughness);
  material.setMetallicFactor(spec.metallic);
  if (spec.emissive) {
    const { factor, strength } = emissiveParams(spec.emissive);
    material.setEmissiveFactor(factor);
    if (strength !== null) {
      material.setExtension(
        'KHR_materials_emissive_strength',
        source
          .createExtension(KHRMaterialsEmissiveStrength)
          .createEmissiveStrength()
          .setEmissiveStrength(strength),
      );
    }
  }
  if (spec.toneMapped === false) material.setExtras({ toneMapped: false });
  return `${spec.name} ${spec.color}${mapped ? '' : ' (retinted)'}`;
}

/** The kit has no textures (flat colours), so UVs are dead weight and block quantization. */
function dropUnusedUvs(document: Document): void {
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) primitive.setAttribute('TEXCOORD_0', null);
  }
}

/** Vertex positions of the 6 indices of the monitor face (the model's only 2-triangle primitive). */
function readScreenQuad(document: Document): Vec3[] {
  const quads = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .filter((primitive: Primitive) => isScreenQuad(primitive.getIndices()?.getCount() ?? 0));
  if (quads.length !== 1) throw new Error(`expected one screen quad, found ${quads.length}`);
  const quad = quads[0]!;
  const material = quad.getMaterial();
  const sharing = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .filter((primitive: Primitive) => primitive.getMaterial() === material);
  if (sharing.length !== 1) throw new Error('screen material is shared with other primitives');
  const positions = quad.getAttribute('POSITION')!;
  return Array.from(quad.getIndices()!.getArray()!, (index) => {
    const [x, y, z] = positions.getElement(index, [0, 0, 0]);
    return [x, y, z] as Vec3;
  });
}

await main();
