// The desk: one merged, meshopt-compressed GLB placed by `layout.ts`, lit as a night scene with a
// warm lamp and a faint green screen glow. Loaded only through the dynamic import in HeroIsland.
import { ContactShadows, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, type Material, type Mesh, type Object3D, type RectAreaLight } from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import screenAnchor from '../../lib/hero/screen-anchor.json';
import {
  DESK_PLACEMENT,
  DESK_TOP_Y,
  FLOOR_PLACEMENTS,
  PROP_PLACEMENTS,
  lampBulbWorld,
  screenWorldCenter,
  type Placement,
} from '../../lib/hero/layout';
import type { ZoomStore } from '../../lib/hero/zoom';
import type { HeroMotion } from '../../lib/capabilities';
import { CameraRig } from './Parallax';

/** Same-origin, Meshopt only: no Draco decoder, so nothing is fetched from a CDN. */
export const HERO_GLB_URL = '/models/hero-desk.glb';
const USE_DRACO = false;
const USE_MESHOPT = true;

const BACKGROUND = '#0a0e0d';
const WALL_Z = -0.46;
// Moonlit fill, warm lamp, mint screen glow (design AD9).
const SKY = '#1b2430';
const GROUND = '#120c08';
const MOON = '#8fa8c8';
const LAMP_COLOR = '#ffb35c';
const GLOW_COLOR = '#3ddc97';

// The init only uploads shared lookup tables; calling it once at module load is enough.
RectAreaLightUniformsLib.init();

/** glTF cannot express `toneMapped: false`; the build script stores it in material extras. */
function applyMaterialExtras(root: Object3D): void {
  root.traverse((object) => {
    const material = (object as Mesh).material as Material | Material[] | undefined;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if (m.userData.toneMapped === false) m.toneMapped = false;
    }
  });
}

function Model({ placement, source }: { placement: Placement; source: Object3D }) {
  const object = useMemo(() => {
    const node = source.getObjectByName(placement.id);
    if (!node) throw new Error(`hero-desk.glb has no node named ${placement.id}`);
    const clone = node.clone(true);
    applyMaterialExtras(clone);
    return clone;
  }, [source, placement.id]);
  return (
    <primitive
      object={object}
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
    />
  );
}

function ScreenGlow() {
  const light = useRef<RectAreaLight>(null);
  const center = screenWorldCenter();
  const [nx, ny, nz] = screenAnchor.normal;
  // Pull the emitter just in front of the glass and aim it along the screen normal.
  const position: [number, number, number] = [
    center[0] + nx * 0.01,
    center[1] + ny * 0.01,
    center[2] + nz * 0.01,
  ];
  useLayoutEffect(() => {
    light.current?.lookAt(position[0] + nx, position[1] + ny, position[2] + nz);
  });
  return (
    <rectAreaLight
      ref={light}
      position={position}
      width={screenAnchor.width}
      height={screenAnchor.height}
      color={GLOW_COLOR}
      intensity={2}
    />
  );
}

function Desk({ onFirstFrame, shadows }: { onFirstFrame: () => void; shadows: boolean }) {
  const { scene } = useGLTF(HERO_GLB_URL, USE_DRACO, USE_MESHOPT);
  const frames = useRef(0);
  useFrame(({ invalidate }) => {
    frames.current += 1;
    // Two frames: the first uploads the GPU resources, the second is the one worth showing. On
    // demand (reduced motion) nothing else asks for the second one, so ask here.
    if (frames.current < 2) invalidate();
    if (frames.current === 2) onFirstFrame();
  });
  const placements = [DESK_PLACEMENT, ...PROP_PLACEMENTS, ...FLOOR_PLACEMENTS];
  return (
    <>
      {placements.map((placement) => (
        <Model key={placement.id} placement={placement} source={scene} />
      ))}
      {shadows ? (
        <ContactShadows
          frames={1}
          position={[0.36, DESK_TOP_Y + 0.001, -0.17]}
          scale={0.9}
          blur={2.4}
          far={0.3}
          opacity={0.55}
          resolution={256}
        />
      ) : null}
    </>
  );
}

export interface DeskSceneProps {
  /** Called once the first frames of the loaded scene are on screen. */
  onReady: () => void;
  /** Contact shadows are baked once and only on the high tier. */
  shadows: boolean;
  /** Pointer parallax: fine pointers with motion allowed only. */
  parallax: boolean;
  /** Scroll zoom progress the camera rig follows. */
  zoom: ZoomStore;
  /** Capture runs: the camera sits at the still pose instead of the rest pose. */
  still?: boolean;
  /** `reduced` motion frames the monitor closer (still pose) on the wide stage. */
  motion?: HeroMotion;
}

export function DeskScene({
  onReady,
  shadows,
  parallax,
  zoom,
  still = false,
  motion = 'full',
}: DeskSceneProps) {
  const lamp = lampBulbWorld();
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 2.5, 5]} />
      <CameraRig enabled={parallax && !still} zoom={zoom} still={still} motion={motion} />
      <hemisphereLight args={[SKY, GROUND, 1.2]} />
      <directionalLight position={[-0.6, 1.4, 1.2]} color={MOON} intensity={1} />
      <pointLight position={lamp} color={LAMP_COLOR} intensity={2} decay={2} distance={3.6} />
      <ScreenGlow />
      <mesh position={[0.4, 0.8, WALL_Z]}>
        <planeGeometry args={[4, 2.4]} />
        <meshStandardMaterial color="#16110d" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0, -0.5]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#120c08" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <Desk onFirstFrame={onReady} shadows={shadows} />
      </Suspense>
    </>
  );
}
