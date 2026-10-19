import { crc32, deflateSync } from "node:zlib";
import type { Canvas } from "@napi-rs/canvas";

// App Store screenshots and icons can't have an alpha channel, and canvas.toBuffer("image/png")
// always writes one: this writes an 8-bit RGB PNG (color type 2) from a canvas instead. Rows use
// the "Up" filter, which packs this flat art tightly.

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** The canvas as an opaque PNG (alpha dropped; the canvas is expected to be fully painted). */
export function opaquePng(canvas: Canvas): Buffer {
  const w = canvas.width;
  const h = canvas.height;
  const rgba = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const row = y * stride;
    raw[row] = 2; // "Up": each byte minus the one above it
    const above = (y - 1) * w * 4;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = row + 1 + x * 3;
      if (y === 0) {
        raw[o] = rgba[i]!;
        raw[o + 1] = rgba[i + 1]!;
        raw[o + 2] = rgba[i + 2]!;
      } else {
        const j = above + x * 4;
        raw[o] = (rgba[i]! - rgba[j]!) & 255;
        raw[o + 1] = (rgba[i + 1]! - rgba[j + 1]!) & 255;
        raw[o + 2] = (rgba[i + 2]! - rgba[j + 2]!) & 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 8 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
