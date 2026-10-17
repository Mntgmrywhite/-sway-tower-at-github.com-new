import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { shots } from "../../preview/shots";
import { render } from "../../render";
import { neon } from "../neon";
import type { NeonSkin, Scene } from "../skin";
import { drawArcade } from "./arcade";
import { carAt, drawCar } from "./car";
import { drifters } from "./drift";
import { ARCADE, PALMS } from "./ground";
import { drawPalm, RIM } from "./palms";
import { hudBottom, sunAt } from "./sky";
import { toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge or the HUD at the top, none stands in the tower's
// column above its floor line, and no two overlap. (The car leaves for good inside the first ten
// seconds, car.ts: once it is gone it need not be drawn.) The sun is the backdrop's centerpiece and
// sits behind the tower on purpose; it only has to stay below the HUD.

const SIZES = [
  [390, 844],
  [375, 667],
] as const;
const TIMES = [0, 1.3, 2.7, 4.1, 6.6, 9.4] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
const PROPS: { name: string; draw: Draw; shows?: (s: Scene) => boolean }[] = [
  { name: "left palm", draw: (ctx, s) => drawPalm(ctx, s, PALMS[0]!, RIM) },
  { name: "right palm", draw: (ctx, s) => drawPalm(ctx, s, PALMS[1]!, RIM) },
  { name: "arcade", draw: (ctx, s) => drawArcade(ctx, s, ARCADE) },
  { name: "car", draw: drawCar, shows: (s) => carAt(s).phase !== "gone" },
  { name: "lane clouds", draw: (ctx, s) => drifters(ctx, s, toneOf(s)) },
];

/** The scene the start shot renders with. */
function startScene(W: number, H: number, t: number): Scene {
  const shot = shots().find((s) => s.name === "start")!;
  shot.view.t += t;
  let scene: Scene | undefined;
  const spy: NeonSkin = { ...neon, ground: (_, s) => (scene = { ...s }) };
  const canvas = createCanvas(W, H);
  render(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, W, H, shot.state, shot.view, shot.best, spy);
  return scene!;
}

/** Which pixels a drawing covers (alpha above a faint anti-aliased edge). */
function mask(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8Array {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  draw(ctx);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3]! > 40 ? 1 : 0;
  return out;
}

describe("synthwave layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    const hud = Math.round(hudBottom(s));

    const sun = sunAt(s, toneOf(s));
    expect(sun.y - sun.r, "the sun's top is below the HUD").toBeGreaterThan(hud);

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === 0 || y === H - 1) edge++;
          if (y < s.groundY && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
        }
      }
      if (prop.shows?.(s) ?? true) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(50);
      expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        const n = masks[j]!;
        let both = 0;
        for (let k = 0; k < m.length; k++) both += m[k]! & n[k]!;
        expect(both, `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  });
});
