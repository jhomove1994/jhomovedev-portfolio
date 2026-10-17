import { describe, expect, it } from 'vitest';
import {
  DESKTOP_ASPECT,
  cameraPoseFor,
  restCameraFor,
  stillCameraFor,
} from '../../../src/lib/hero/layout';

describe('cameraPoseFor', () => {
  it('uses the rest pose with full motion on the wide stage', () => {
    expect(cameraPoseFor({ motion: 'full', aspect: DESKTOP_ASPECT })).toEqual(
      restCameraFor(DESKTOP_ASPECT),
    );
  });

  it('uses the still pose under reduced motion on the wide stage (no zoom to read the terminal)', () => {
    expect(cameraPoseFor({ motion: 'reduced', aspect: DESKTOP_ASPECT })).toEqual(
      stillCameraFor(DESKTOP_ASPECT),
    );
  });

  it('keeps the rest pose under reduced motion on the stacked stage', () => {
    expect(cameraPoseFor({ motion: 'reduced', aspect: 1.2 })).toEqual(restCameraFor(1.2));
  });

  it('always uses the still pose for capture runs, whatever the motion', () => {
    expect(cameraPoseFor({ motion: 'full', aspect: DESKTOP_ASPECT, capture: true })).toEqual(
      stillCameraFor(DESKTOP_ASPECT),
    );
    expect(cameraPoseFor({ motion: 'full', aspect: 1.2, capture: true })).toEqual(
      stillCameraFor(1.2),
    );
  });
});
