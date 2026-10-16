import { inflateSync } from 'node:zlib';

/** Decodes an 8-bit, non-interlaced RGB/RGBA PNG (what Chromium screenshots produce) to RGBA. */
export function decodePng(png: Buffer): { width: number; height: number; rgba: Uint8ClampedArray } {
  let offset = 8; // skip signature
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(
          `Unsupported PNG (depth ${depth}, color ${colorType}, interlace ${interlace})`,
        );
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[y * stride + x - channels]! : 0;
      const up = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels]! : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[y * stride + x] = (raw[line + x]! + predictor) & 0xff;
    }
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = out[i * channels]!;
    rgba[i * 4 + 1] = out[i * channels + 1]!;
    rgba[i * 4 + 2] = out[i * channels + 2]!;
    rgba[i * 4 + 3] = channels === 4 ? out[i * channels + 3]! : 255;
  }
  return { width, height, rgba };
}
