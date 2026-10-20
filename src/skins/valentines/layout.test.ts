import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT, DROP_GAP } from "../../config";
import type { Scene } from "../skin";
import { lamp, shops } from "./boulevard";
import { IRON, MARBLE } from "./colors";
import { couple } from "./couple";
import { drifters } from "./drift";
import { cloudBank, fairHill, floorTop, hills, landLine, wheelAt } from "./far";
import { front, railFoot, railTop } from "./front";
import { floatingIn } from "./cupid";
import { cherubColumn, cherubShow, inkW, PLINTH_X, plazaProps, pool, roseBeds } from "./garden";
import { sun } from "./sky";
import { context, mask, overlap, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";
import { bridge, canal, swans } from "./water";

// The start view, on a tall and a short phone and a tablet, at moments all through the actions:
// each prop is drawn alone, and none touches a screen edge, the HUD at the top or the railing in
// front, none stands in the tower's column above its floor line, nothing beside the base block
// rises into the slider's first lane (a bar above the base in Slide, a bar higher still in Drop:
// the bar sweeps right across the screen there) but the cherub's slim column shaft and his
// balloon's string, and the flat water of the canal's near end, which lies on the lawn like the
// lawn itself. And the owner's rule, that no prop cuts into another: every two props keep at
// least GAP of plaza, lawn or sky between them (and from the railing), except where they meet by
// design: the far scenery (the hills, the cloud bank and the fair hill) stands behind the
// boulevard, the couple sit on the café's terrace, the bridge and the swans are on the canal,
// the swans glide in front of the bridge, the cherub stands on his column, his balloon's string
// is tied to the pool's rim, his arrow leaves his bow, pops the balloon and drops into the pool,
// and the pop's petals rain round him. The column itself stands on the lawn behind the pool,
// clear of its rim (the owner saw it standing over the rim), the balloon floats clear of the
// cherub (it used to bob against his wing and bow), and the rose beds and the gifts each have
// paving all round. Only a fresh balloon floating in (from the second telling on) may cross the
// screen's left side: the pop's flash once reached it on every phone.

/** The screens: the phones every layout test runs on, and two iPads (the app runs on both). */
const SCREENS = [...SIZES, [768, 1024], [1024, 1366]] as const;

/**
 * Moments of the scene's clock: the marble statue with the balloon tied up over his shoulder,
 * waking, drawing, the arrow in flight, the pop and its flash (at its biggest), the arrow
 * tumbling over (pointing out to the left edge's side) and dropping into the pool, the hop and
 * hearts, the quiet after (the swans' heart, the card), the cherub turning back to marble, the
 * swans turning away and drifting apart; then the second balloon floating in from the left as
 * he raises his bow to it, arriving, shot, its flash and the arrow tumbling, and the couple's
 * second telling.
 */
const TIMES = [0, 1.2, 2.6, 3.15, 3.45, 3.5, 3.6, 3.7, 4.1, 5.2, 8.5, 16.2, 19.8, 21, 22.4, 23, 24.3, 24.65, 24.8, 24.9, 28.5] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `above`: stands above the floor line (so must keep out of the tower's column). `scenery`: the
 * far layer, which stands behind everything and may run off the screen's sides. `ground`: flat
 * ground (the canal's water), which may lie in the slider's lanes. `slim`: the one thing of it
 * in the slider's lanes is a slim upright (the column's shaft, the balloon's string, the arrow
 * dropping), no wider than this (u). `enters`: at these times something of it floats in through
 * the screen's left side (a fresh balloon, every CYCLE from the second). `half`: only the left
 * (-1) or right (1) half of what `draw` paints (the two rose beds, the two gifts), so each is a
 * prop of its own. `sometimes`: only there for part of the story (the balloon till it pops, the
 * arrow loosed, the burst).
 */
interface Prop {
  name: string;
  draw: Draw;
  above: boolean;
  scenery?: boolean;
  ground?: boolean;
  slim?: number;
  enters?: (t: number) => boolean;
  half?: -1 | 1;
  sometimes?: boolean;
}

const PROPS: Prop[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s))), above: true },
  { name: "hills", draw: (ctx, s) => hills(ctx, s, toneOf(s), s.horizonY), above: false, scenery: true },
  { name: "cloud bank", draw: (ctx, s) => cloudBank(ctx, s, toneOf(s), landLine(s)), above: false, scenery: true },
  { name: "fair hill", draw: (ctx, s) => fairHill(ctx, s, toneOf(s)), above: false, scenery: true },
  // The townhouse stands behind the tower on purpose (it never moves: calm.test.ts).
  { name: "boulevard", draw: (ctx, s) => shops(ctx, s, toneOf(s)), above: false },
  { name: "couple", draw: (ctx, s) => couple(ctx, s, toneOf(s)), above: true },
  { name: "canal", draw: (ctx, s) => canal(ctx, s, toneOf(s)), above: true, ground: true },
  { name: "bridge", draw: (ctx, s) => bridge(ctx, s, toneOf(s)), above: true },
  { name: "swans", draw: (ctx, s) => swans(ctx, s, toneOf(s)), above: true },
  // The pedestal's slab is the tower's floor; the pool hangs below it.
  { name: "pool", draw: pool, above: true },
  // Only the column's shaft (0.04 u and its ink) stands in the slider's lanes, its capital above them.
  { name: "column", draw: cherubColumn, above: true, slim: 0.05 },
  // The cherub himself, with his bow (and the arrow nocked) and the hearts he sends up; his
  // balloon on its string (which crosses the slider's lanes); the arrow loosed, tumbling down
  // through the lanes into the pool, and its splash; the pop's flash and petals.
  { name: "cherub", draw: (ctx, s) => cherubShow(ctx, s, "figure"), above: true },
  { name: "balloon", draw: (ctx, s) => cherubShow(ctx, s, "balloon"), above: true, slim: 0.05, enters: floatingIn, sometimes: true },
  { name: "arrow", draw: (ctx, s) => cherubShow(ctx, s, "arrow"), above: true, slim: 0.05, sometimes: true },
  { name: "burst", draw: (ctx, s) => cherubShow(ctx, s, "burst"), above: true, sometimes: true },
  { name: "left rose bed", draw: roseBeds, above: false, half: -1 },
  { name: "right rose bed", draw: roseBeds, above: false, half: 1 },
  { name: "chocolates", draw: plazaProps, above: false, half: -1 },
  { name: "bouquet", draw: plazaProps, above: false, half: 1 },
];

/** The meetings that are the design (besides the far scenery, which stands behind everything but the sun). */
const ALLOWED = [
  ["couple", "boulevard"],
  ["bridge", "canal"],
  ["swans", "canal"],
  ["swans", "bridge"],
  ["cherub", "column"],
  ["balloon", "pool"],
  ["arrow", "cherub"],
  ["arrow", "balloon"],
  ["arrow", "pool"],
  ["burst", "cherub"],
  ["burst", "balloon"],
  ["burst", "arrow"],
];

function allowed(a: Prop, b: Prop): boolean {
  if ((a.scenery || b.scenery) && a.name !== "sun" && b.name !== "sun") return true;
  return ALLOWED.some(([x, y]) => (x === a.name && y === b.name) || (x === b.name && y === a.name));
}

/** The room every prop keeps from the next (px): a hundredth of u, so a sliver of paving shows between them on any screen. */
function gapFor(s: Scene): number {
  return Math.max(2, Math.round(s.u * 0.01));
}

/** A mask grown by `r` pixels every way (a square), so an overlap with it means the two come closer than `r`. */
function grow(m: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const rows = new Uint8Array(m.length);
  const sum = new Int32Array(Math.max(W, H) + 1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) sum[x + 1] = sum[x]! + m[y * W + x]!;
    for (let x = 0; x < W; x++) rows[y * W + x] = sum[Math.min(W, x + r + 1)]! - sum[Math.max(0, x - r)]! > 0 ? 1 : 0;
  }
  const out = new Uint8Array(m.length);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) sum[y + 1] = sum[y]! + rows[y * W + x]!;
    for (let y = 0; y < H; y++) out[y * W + x] = sum[Math.min(H, y + r + 1)]! - sum[Math.max(0, y - r)]! > 0 ? 1 : 0;
  }
  return out;
}

/** What a prop paints, alone (only its half of the screen, for a `half` prop). */
function propMask(p: Prop, s: Scene, W: number, H: number): Uint8Array {
  const m = mask(W, H, (ctx) => p.draw(ctx, s));
  if (p.half) {
    for (let i = 0; i < m.length; i++) {
      const left = i % W < W / 2;
      if (left !== p.half < 0) m[i] = 0;
    }
  }
  return m;
}

describe("valentine's layout", () => {
  it.each(SCREENS.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => propMask(p, s, W, H));
    const railing = mask(W, H, (ctx) => front(ctx, s));
    const gap = gapFor(s);
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The floor line, less half an ink line (the slab's outline straddles it).
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    // The HUD (title, best, lives) at the top.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;
    // The slider's lanes at a run's start: a bar above the base in Slide, a bar higher in Drop.
    const lane0 = baseTop - (BLOCK_HEIGHT + DROP_GAP) * s.scale;

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let drawn = 0;
      let laneWide = 0;
      for (let y = 0; y < H; y++) {
        let lx0: number = W;
        let lx1 = -1;
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if ((x === 0 && !prop.enters?.(t)) || x === W - 1 || y === 0) edge++;
          if (prop.above && y < floor && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (y >= lane0 && y < baseTop) {
            lx0 = Math.min(lx0, x);
            lx1 = Math.max(lx1, x);
          }
        }
        // In the slider's lanes, only a slim upright of a `slim` prop (and nothing of any other but flat ground).
        if (lx1 >= 0 && y >= lane0 && y < baseTop && !prop.ground) {
          const w = lx1 - lx0 + 1;
          if (prop.slim === undefined || w > prop.slim * s.u) laneWide++;
        }
      }
      if (!prop.sometimes) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(20);
      if (!prop.scenery) expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(laneWide, `${prop.name}: rows in the slider's lanes wider than a slim upright`).toBe(0);
      if (prop.scenery) return;
      const near = grow(m, W, H, gap);
      expect(overlap(near, railing), `${prop.name} comes within ${gap}px of the railing in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop, PROPS[j]!)) continue;
        expect(overlap(near, masks[j]!), `${prop.name} comes within ${gap}px of ${PROPS[j]!.name}`).toBe(0);
      }
    });
    // The swans keep to the canal (or the bridge behind them): no head or beak pokes out over the
    // quays onto the lawn, at any turn of their story.
    const swansAt = masks[PROPS.findIndex((p) => p.name === "swans")]!;
    const water = grow(
      mask(W, H, (ctx) => {
        canal(ctx, s, toneOf(s));
        bridge(ctx, s, toneOf(s));
      }),
      W,
      H,
      1,
    );
    let off = 0;
    for (let i = 0; i < swansAt.length; i++) if (swansAt[i] && !water[i]) off++;
    expect(off, "swan pixels off the canal and the bridge").toBe(0);
    // The opening's sky holds the sun and, over the fair, a pair of doves wheeling: nothing else
    // drifts in the lane at the start, and the doves keep above the wheel and out of the HUD (the
  // title, best and lives, centered: on a tablet the doves wheel beside the lives' row).
    const lane = mask(W, H, (ctx) => drifters(ctx, s, toneOf(s)));
    const wheel = wheelAt(s);
    let doves = 0;
    for (let i = 0; i < lane.length; i++) {
      if (!lane[i]) continue;
      doves++;
      const x = i % W;
      const y = Math.floor(i / W);
      if (Math.abs(x - W / 2) < s.u * 0.36) expect(y, `a drifter at (${x}, ${y}) in the HUD`).toBeGreaterThanOrEqual(hud);
      expect(y, `a drifter at (${x}, ${y}) down at the wheel`).toBeLessThan(wheel.y - wheel.r - 2);
      expect(x, `a drifter at (${x}, ${y}) off the fair`).toBeGreaterThan(W / 2 + s.u * 0.3);
    }
    expect(doves, "the doves over the fair").toBeGreaterThan(10);
    // The slim things in the slider's lanes are where they should be: the column at the plinth's x.
    const col = masks[PROPS.findIndex((p) => p.name === "column")]!;
    for (let y = Math.ceil(lane0); y < Math.floor(baseTop); y++) {
      for (let x = 0; x < W; x++) {
        if (col[y * W + x]) expect(Math.abs(x - (W / 2 + PLINTH_X * s.u)), `column pixel at (${x}, ${y}) in the lane, off its shaft`).toBeLessThan(s.u * 0.04);
      }
    }
  }, 60_000);

  it("the spacing check bites: props a hair apart fail it", () => {
    // Two marks GAP - 1 apart are too close; GAP + 1 apart are clear.
    const W = 40;
    const H = 10;
    const a = new Uint8Array(W * H);
    const b = new Uint8Array(W * H);
    a[5 * W + 10] = 1;
    b[5 * W + 10 + 3] = 1;
    expect(overlap(grow(a, W, H, 4), b)).toBeGreaterThan(0);
    expect(overlap(grow(a, W, H, 2), b)).toBe(0);
  });

  it.each(SIZES)("%ix%i: the lamp post at the row's end stays in from the screen's right edge", (W, H) => {
    const s = startScene(W, H, 0);
    const m = mask(W, H, (ctx) => lamp(ctx, s, toneOf(s)));
    let right = 0;
    let drawn = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      drawn++;
      right = Math.max(right, i % W);
    }
    expect(drawn).toBeGreaterThan(20);
    expect(right).toBeLessThan(W - 3);
  });
});

/** The railing's iron and the curb's marble, as [r, g, b]. */
const RAIL_COLORS = [IRON.body, IRON.light, IRON.shade, MARBLE.body, MARBLE.light, MARBLE.shade].map((hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
);

function railPixels(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (RAIL_COLORS.some(([r, g, b]) => Math.abs(data[i]! - r!) + Math.abs(data[i + 1]! - g!) + Math.abs(data[i + 2]! - b!) < 24)) n++;
  }
  return n;
}

describe("valentine's railing", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). On every phone that line falls somewhere across the railing, so the railing
  // keeps a gateway open in the middle: only pavers and the curb there.
  it.each(SIZES)("%ix%i: the gateway leaves the start line clear of the rails", (W, H) => {
    const s = startScene(W, H, 0);
    const ctx = context(W, H);
    front(ctx, s);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    // The rails' band: from the top rail to the lower rail's foot.
    const y0 = Math.floor(railTop(s) - s.u * 0.03);
    const y1 = Math.ceil(railTop(s) + s.u * 0.07);
    const gate = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let iron = 0;
    for (let i = 0; i < gate.length; i += 4) {
      const [r, g, b] = [IRON.body, IRON.light, IRON.shade].map((hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)))[0]!;
      if (Math.abs(gate[i]! - r!) + Math.abs(gate[i + 1]! - g!) + Math.abs(gate[i + 2]! - b!) < 24) iron++;
    }
    expect(iron, "iron in the gateway").toBe(0);
    // And the railing is there, either side of it (sampled across the top rail).
    const row = Math.round(railTop(s) + s.u * 0.005);
    const side = Math.round(W / 2 - s.u * 0.22);
    expect(railPixels(ctx.getImageData(0, row, side, 1).data), "railing on the left").toBeGreaterThan(s.u * 0.15);
    expect(railPixels(ctx.getImageData(W - side, row, side, 1).data), "railing on the right").toBeGreaterThan(s.u * 0.15);
    // The curb runs right across under it, over the base band's top (its lowest band is clear of the locks and balusters).
    const curb = Math.round(railFoot(s) - s.u * 0.007);
    expect(railPixels(ctx.getImageData(0, curb, W, 1).data), "the curb across the screen").toBeGreaterThan(W * 0.9);
  });
});
