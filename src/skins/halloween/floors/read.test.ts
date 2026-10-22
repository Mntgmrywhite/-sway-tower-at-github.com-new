import { describe, expect, it } from "vitest";
import { FLOOR_BARS } from "./floor";
import { BEAM, DOOR, INK, kindOf, KINDS, PANE_LIT, STRIPE, STRIPES, TALL, TIMBER } from "./palette";
import { BASE_W, dist, H_PHONE, info, luminance, rgb, shoot } from "./test-floor";
import { FR, layout, PANE_HH, PANE_HW, ROOM_H, ROOM_W } from "./windows";

// Readability first (R3–R6, R8, R9): the floors have to read instantly against a dark night. Each
// storey is mostly its own flat paint (so its color is what the eye takes in), its body is bright
// and inks well, neighbors are far apart in color, the windows and the room never take over the
// face, a falling piece has its lights out, and the roof on top stays dark so the slider and a
// falling bar read over it.

/** CIE76 ΔE between two sRGB colors. */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    const X = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047;
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    const Z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883;
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

function contrast(a: string, b: string): number {
  const la = luminance(rgb(a));
  const lb = luminance(rgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const MOMENTS = [0.4, 2.7, 5.3, 8.1, 13.6, 21.2];

describe("the floors read at a glance", () => {
  it("R3: most of every storey's face is its own flat paint", () => {
    for (let level = 0; level < 13; level++) {
      const K = kindOf(level);
      // Body, bands, siding (lines, stripes or beams) and the stitched patch: the wall's own paint
      const flat = [K.body, K.cornice, K.skirt, K.line, K.patch, K.material === STRIPES ? STRIPE : K.line, K.material === TIMBER ? BEAM : K.line].map(rgb);
      for (const t of MOMENTS) {
        const s = shoot(level, BASE_W, H_PHONE, info(t));
        // The face: inside the outline
        const pad = 0.1 * s.h;
        let n = 0;
        let own = 0;
        for (let py = Math.ceil(s.y + pad); py < s.y + s.h - pad; py++) {
          for (let px = Math.ceil(s.x + pad); px < s.x + s.w - pad; px++) {
            const i = (py * s.W + px) * 4;
            const c = [s.data[i]!, s.data[i + 1]!, s.data[i + 2]!];
            n++;
            if (flat.some((f) => dist(c, f) <= 24)) own++;
          }
        }
        expect(own / n, `level ${level} at ${t} s`).toBeGreaterThanOrEqual(0.5);
      }
    }
  });

  it("R4: neighboring storeys are far apart in color (and the ground floor from the one above)", () => {
    const n = FLOOR_BARS.length;
    for (let i = 0; i < n; i++) {
      const a = FLOOR_BARS[i]!.color;
      const b = FLOOR_BARS[(i + 1) % n]!.color;
      expect(deltaE(a, b), `${a} / ${b}`).toBeGreaterThanOrEqual(40);
    }
    expect(deltaE(kindOf(0).body, kindOf(1).body)).toBeGreaterThanOrEqual(40);
    // The bars are the floors' bodies, in order (the blast debris and the Settings swatch use them).
    KINDS.forEach((K, i) => expect(K.body).toBe(FLOOR_BARS[i]!.color));
  });

  it("R5: every body is bright and inks well", () => {
    for (const K of [...KINDS, kindOf(0)]) {
      expect(contrast(K.body, INK), K.body).toBeGreaterThanOrEqual(4.5);
      expect(luminance(rgb(K.body)), K.body).toBeGreaterThanOrEqual(0.24);
    }
  });

  it("R6: the windows and the room cover at most 35% of the face, at any width", () => {
    for (let level = 0; level < 24; level++) {
      const K = kindOf(level);
      for (let W = 1; W <= 14; W += 0.23) {
        const L = layout(0, W, 1, level, K);
        const hw = (K.shape === TALL ? PANE_HW * 0.74 : PANE_HW) + FR;
        let area = L.n * 4 * hw * (PANE_HH + FR);
        if (L.room && K.room !== DOOR) area += ROOM_W * ROOM_H;
        expect(area / W, `level ${level} at ${W.toFixed(2)} heights wide`).toBeLessThanOrEqual(0.35);
      }
    }
  });

  it("R8: a falling piece has its lights out", () => {
    const lit = rgb(PANE_LIT);
    for (let level = 0; level < 24; level++) {
      for (const t of MOMENTS) {
        const s = shoot(level, BASE_W, H_PHONE, info(t, "loose"));
        const near = (px: number, py: number) => {
          const i = (py * s.W + px) * 4;
          return s.data[i + 3]! > 200 && dist([s.data[i]!, s.data[i + 1]!, s.data[i + 2]!], lit) <= 16;
        };
        // Lamplight: a patch of the lit panes' color, not a stray anti-aliased pixel
        let n = 0;
        for (let py = 0; py < s.H - 1; py++) for (let px = 0; px < s.W - 1; px++) if (near(px, py) && near(px + 1, py) && near(px, py + 1) && near(px + 1, py + 1)) n++;
        expect(n, `level ${level} at ${t} s`).toBe(0);
      }
    }
  });

  it("R9: the roof on top stays dark (mean luminance at most 0.08; the plan asks 0.12)", () => {
    for (let level = 0; level < 24; level++) {
      for (const w of [BASE_W, 3.5 * H_PHONE, 2 * H_PHONE, 1 * H_PHONE]) {
        for (const t of [0.5, 3.1, 7.7]) {
          const s = shoot(level, w, H_PHONE, info(t, "top"));
          let sum = 0;
          let n = 0;
          for (let py = 0; py < Math.floor(s.y) - 1; py++) {
            for (let px = 0; px < s.W; px++) {
              const i = (py * s.W + px) * 4;
              const a = s.data[i + 3]! / 255;
              if (a < 0.1) continue;
              // Over the darkest the sky gets (its pixels are premultiplied-free RGBA)
              sum += luminance([s.data[i]! * a, s.data[i + 1]! * a, s.data[i + 2]! * a]);
              n++;
            }
          }
          if (n === 0) continue;
          expect(sum / n, `level ${level} w ${w} t ${t}`).toBeLessThanOrEqual(0.08);
        }
      }
    }
  });
});
