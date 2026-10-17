import type { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';

/** gsap and its ScrollTrigger plugin, loaded lazily and handed to every section effect. */
export interface MotionKit {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
}

/** A section effect: wires itself up and returns what it needs removed. */
export type Effect = (kit: MotionKit) => void;
