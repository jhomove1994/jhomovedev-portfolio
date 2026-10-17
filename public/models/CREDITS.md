# Credits

## Shipped models

| File            | What it is                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero-desk.glb` | One merged, Meshopt-compressed scene of the hero desk. Built by `pnpm models:build` from the eight Kenney models below; materials are re-coloured to a warm night palette. |

### Source models: Kenney Furniture Kit 2.0

- Author: Kenney (https://www.kenney.nl)
- Source: Furniture Kit 2.0, https://kenney.nl/assets/furniture-kit
- License: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/). Credit is optional and given here anyway.
- The unmodified originals and the kit's license file live in `assets/models/raw/` (tracked, not served).

Models used in `hero-desk.glb`:

1. `desk.glb`
2. `computerScreen.glb`
3. `computerKeyboard.glb`
4. `computerMouse.glb`
5. `lampRoundTable.glb`
6. `books.glb`
7. `radio.glb`
8. `pottedPlant.glb`

Modifications: unlit materials replaced by lit PBR materials, colours shifted to a walnut/rustic palette, texture coordinates removed, meshes merged, quantized and compressed.

## Libraries

| Library                                                            | License                                             | Notes                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GSAP (GreenSock)                                                   | GreenSock Standard "no charge" license, **not MIT** | https://gsap.com/standard-license. Free to use, including commercially, on websites; no attribution required, but proprietary notices must not be removed. Not allowed for building no-code visual animation tools that compete with Webflow. Copyright GreenSock. |
| Lenis                                                              | MIT                                                 | Copyright darkroom.engineering.                                                                                                                                                                                                                                    |
| three.js                                                           | MIT                                                 | Copyright mrdoob and three.js authors.                                                                                                                                                                                                                             |
| React Three Fiber (`@react-three/fiber`)                           | MIT                                                 | pmndrs.                                                                                                                                                                                                                                                            |
| drei (`@react-three/drei`)                                         | MIT                                                 | pmndrs.                                                                                                                                                                                                                                                            |
| `@react-three/postprocessing`                                      | MIT                                                 | pmndrs.                                                                                                                                                                                                                                                            |
| postprocessing                                                     | Zlib                                                | Copyright Raoul van Rüschen (pmndrs). The wrapper `@react-three/postprocessing` is MIT; the underlying `postprocessing` package is Zlib.                                                                                                                           |
| glTF-Transform and meshoptimizer (build tooling only, not shipped) | MIT                                                 | Used by `pnpm models:build`.                                                                                                                                                                                                                                       |
