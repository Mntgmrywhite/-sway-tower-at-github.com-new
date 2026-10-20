import { describe, expect, it } from "vitest";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { drifters } from "./drift";
import { BALES_AT, beerGarden, church, farLine, ferrisWheel, floorTop, foothills, hayBales, house, mountains, swingRide, VILLAGE_FOOT } from "./far";
import { band, dance, dancers, FOLK_LINE, LEAP } from "./folk";
import { AWNING_UP, bandTop, fence, FENCE_POSTS, FOOT, front, frontFoot, frontGround, GATE, GRASS_AT, POST_W, pretzelStall, sausageStall, STALL_IN, STALL_OUT, stallSmoke } from "./front";
import { WOOD, WOOD_DARK } from "./colors";
import { bandstand, inkW, maypole, SKIRT, tent } from "./ground";
import { halfWidth, parade, PARADE_LINE, paradeAt, waitress, WAITRESS_LINE, waitressAt } from "./parade";
import { sun } from "./sky";
import { context, mask, overlap, SIZES, startScene } from "./test-scene";
import { level, toneOf } from "./tone";

// The start view, on a tall and a short phone, at a few animation times: each prop is drawn
// alone, and none touches a screen edge or the HUD at the top, nothing stands in the tower's
// column above its floor line but what is built to stand behind the tower (the tent, the
// maypole and the bandstand with its railings, all of them still), nothing beside the base
// block rises above its top (the slider's first pass never sweeps over the band, the dancers
// or anything else), and no two overlap, except where that is the design: the parade crosses
// in front of the band, the dancers and the bandstand, the parade and the waitress enter and
// leave through the screen's sides and pass behind the stalls and the fence, the folk and the
// parade stand in front of the tent's walls and the bandstand, the maypole rises behind the
// tent's roof, the mountains and foothills run off the screen's sides and stand behind the fair
// and the village.

/** Moments of the scene's clock: the band striking up, the parade crossing, the slap dance, the leap and the bow, the waitress crossing, the band's rest, and later rounds. */
const TIMES = [0, 0.6, 1.5, 2.7, 4, 5.5, 7, 7.5, 8.9, 9.5, 11, 17.4, 21.6, 23, 26.5, 33.5, 41, 50.5] as const;

type Draw = (ctx: CanvasRenderingContext2D, s: Scene) => void;
/**
 * `column`: built to stand in the tower's column above the floor (still). `beside`: stands on
 * the ground beside the base block, so must stay below its top. `scenery`: may run off the
 * screen's sides. `vehicle`: may enter and leave through the sides. `away`: may be missing at
 * times.
 */
interface Prop {
  name: string;
  draw: Draw;
  column?: boolean;
  beside?: boolean;
  scenery?: boolean;
  vehicle?: boolean;
  away?: boolean;
}

const hz = (s: Scene) => farLine(s);
const PROPS: Prop[] = [
  { name: "sun", draw: (ctx, s) => sun(ctx, s, toneOf(s), floorTop(s, level(s))) },
  { name: "lane", draw: (ctx, s) => drifters(ctx, s, toneOf(s)), away: true },
  { name: "mountains", draw: (ctx, s) => mountains(ctx, s, toneOf(s), hz(s)), scenery: true, column: true },
  { name: "foothills", draw: (ctx, s) => foothills(ctx, s, toneOf(s), hz(s)), scenery: true, column: true },
  { name: "church", draw: (ctx, s) => church(ctx, s, toneOf(s), hz(s)) },
  { name: "house", draw: (ctx, s) => house(ctx, s, toneOf(s), hz(s)) },
  { name: "ferris wheel", draw: (ctx, s) => ferrisWheel(ctx, s, toneOf(s), hz(s)) },
  { name: "chain carousel", draw: (ctx, s) => swingRide(ctx, s, toneOf(s), hz(s)) },
  { name: "beer garden", draw: (ctx, s) => beerGarden(ctx, s, toneOf(s), hz(s)) },
  { name: "hay bales", draw: (ctx, s) => hayBales(ctx, s, toneOf(s), hz(s)) },
  { name: "maypole", draw: maypole, column: true },
  { name: "tent", draw: (ctx, s) => tent(ctx, s, toneOf(s)), column: true },
  { name: "bandstand", draw: bandstand, column: true },
  { name: "band", draw: band, beside: true },
  { name: "dancers", draw: dancers, beside: true },
  { name: "parade", draw: parade, vehicle: true, away: true },
  { name: "waitress", draw: waitress, vehicle: true, away: true },
];

/** The meetings that are the design. */
const ALLOWED = [
  ["parade", "band"],
  ["parade", "dancers"],
  ["parade", "bandstand"],
  ["parade", "tent"],
  ["waitress", "bandstand"],
  ["band", "tent"],
  ["band", "bandstand"],
  ["dancers", "tent"],
  ["dancers", "bandstand"],
  ["maypole", "tent"],
  ["tent", "bandstand"],
  ["maypole", "mountains"],
  ["maypole", "foothills"],
  ["tent", "mountains"],
  ["tent", "foothills"],
  ["mountains", "foothills"],
  ["mountains", "beer garden"],
  ["foothills", "beer garden"],
  ["mountains", "church"],
  ["mountains", "house"],
  ["mountains", "ferris wheel"],
  ["mountains", "chain carousel"],
  ["foothills", "church"],
  ["foothills", "house"],
  ["foothills", "ferris wheel"],
  ["foothills", "chain carousel"],
];

function allowed(a: string, b: string): boolean {
  return ALLOWED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

describe("oktoberfest layout", () => {
  it.each(SIZES.flatMap(([W, H]) => TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: props stay clear", (W, H, t) => {
    const s = startScene(W, H, t);
    const masks = PROPS.map((p) => mask(W, H, (ctx) => p.draw(ctx, s)));
    // The stalls and the fence in front.
    const stalls = mask(W, H, (ctx) => front(ctx, s));
    const x0 = Math.ceil(s.baseX - s.u * 0.05);
    const x1 = Math.floor(s.baseX + s.baseW + s.u * 0.05);
    // The floor line, less half an ink line (the bandstand's lip outline straddles it).
    const floor = s.groundY - Math.ceil(inkW(s) / 2) - 1;
    // The HUD (title, best, lives) at the top.
    const hud = Math.round(H * 0.14 + s.u * 0.13);
    const baseTop = s.groundY - BLOCK_HEIGHT * s.scale;
    const half = halfWidth(s);
    const paradeShown = paradeAt(s.t, half).shown;
    const girl = waitressAt(s.t, half);

    PROPS.forEach((prop, i) => {
      const m = masks[i]!;
      let edge = 0;
      let column = 0;
      let top = 0;
      let lane = 0;
      let drawn = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!m[y * W + x]) continue;
          drawn++;
          if (x === 0 || x === W - 1 || y === 0) edge++;
          if (!prop.column && y < floor && x >= x0 && x <= x1) column++;
          if (y < hud) top++;
          if (prop.beside && y < baseTop) lane++;
        }
      }
      const expected =
        prop.name === "parade" ? paradeShown : prop.name === "waitress" ? girl.shown && Math.abs(girl.x) < 0.42 : prop.name === "lane" ? false : true;
      if (expected) expect(drawn, `${prop.name} is drawn`).toBeGreaterThan(20);
      if (!prop.scenery && !prop.vehicle) expect(edge, `${prop.name}: pixels on a screen edge`).toBe(0);
      expect(column, `${prop.name}: pixels in the tower's column above its floor`).toBe(0);
      expect(top, `${prop.name}: pixels in the HUD`).toBe(0);
      expect(lane, `${prop.name}: pixels above the base block (in the slider's first lane)`).toBe(0);
      // The parade and the waitress pass behind the stalls and the fence in front; nothing else reaches them.
      if (!prop.vehicle) expect(overlap(m, stalls), `${prop.name} reaches the stalls in front`).toBe(0);
      for (let j = i + 1; j < PROPS.length; j++) {
        if (allowed(prop.name, PROPS[j]!.name)) continue;
        expect(overlap(m, masks[j]!), `${prop.name} overlaps ${PROPS[j]!.name}`).toBe(0);
      }
    });
  }, 60_000);

  it.each(SIZES)("%ix%i: the waitress comes in through one side of the screen and goes out through the other", (W, H) => {
    // Her first crossing goes left to right, the next right to left: in the first frame any of
    // her shows she is at the side she comes from, and in the last at the side she leaves by.
    const probe = startScene(W, H, 0);
    const half = halfWidth(probe);
    const FRAME = 1 / 60;
    const edges: [number, number][] = [];
    let was = false;
    for (let t = 0; t < 60; t += FRAME) {
      const now = waitressAt(t, half).shown;
      if (now !== was) edges.push(now ? [t, FRAME] : [t - FRAME, -FRAME]);
      was = now;
    }
    expect(edges.length, "two crossings, in and out").toBeGreaterThanOrEqual(4);
    edges.slice(0, 4).forEach(([t0, dt], i) => {
      // Step in from the moment she is counted in view until something of her is drawn.
      for (let n = 0; n < 30; n++) {
        const t = t0 + dt * n;
        const her = mask(W, H, (ctx) => waitress(ctx, startScene(W, H, t)));
        let left: number = W;
        let right = -1;
        for (let k = 0; k < her.length; k++) {
          if (!her[k]) continue;
          left = Math.min(left, k % W);
          right = Math.max(right, k % W);
        }
        if (right < 0) continue;
        // In from the left, out on the right; then in from the right, out on the left.
        if (i === 0 || i === 3) expect(left, `t=${t.toFixed(2)}: at the left side`).toBe(0);
        else expect(right, `t=${t.toFixed(2)}: at the right side`).toBe(W - 1);
        return;
      }
      throw new Error(`t=${t0.toFixed(2)}: she never shows`);
    });
  });
});

/** The fence's wood colors, as [r, g, b]. */
const WOODS = [WOOD, WOOD_DARK].flatMap((c) => [c.body, c.light, c.shade]).map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));

/** Pixels in one of the fence's wood colors (closely: the gravel's scuffs blur toward a wood tone at their edges). */
function woodPixels(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 40) continue;
    if (WOODS.some(([r, g, b]) => Math.abs(data[i]! - r!) + Math.abs(data[i + 1]! - g!) + Math.abs(data[i + 2]! - b!) < 10)) n++;
  }
  return n;
}

describe("oktoberfest fence", () => {
  // render.ts writes "tap to drop" centered at 0.9 of the screen height (0.055 u type, about
  // 0.29 u wide). On every phone that line falls somewhere across the fence, so the fence
  // keeps a gap open in the middle: no rails or posts there, only the gravel path (and, on a
  // short phone, the trodden ground above the band).
  it.each(SIZES)("%ix%i: the gap leaves the start line clear", (W, H) => {
    const s = startScene(W, H, 0);
    const ctx = context(W, H);
    front(ctx, s);
    const x0 = Math.floor(W / 2 - s.u * 0.16);
    const x1 = Math.ceil(W / 2 + s.u * 0.16);
    const y0 = Math.floor(H * 0.9 - s.u * 0.05);
    const y1 = Math.ceil(H * 0.9 + s.u * 0.016);
    expect(woodPixels(ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data), "fence pixels behind the start line").toBe(0);
    expect(GATE).toBeGreaterThanOrEqual(0.16);
    // And the fence is there, either side of it (sampled across its top rail).
    const row = Math.round(bandTop(s) - s.u * 0.024);
    const side = Math.round(W / 2 - s.u * 0.18);
    expect(woodPixels(ctx.getImageData(0, row, side, 1).data), "fence on the left").toBeGreaterThan(s.u * 0.1);
    expect(woodPixels(ctx.getImageData(W - side, row, side, 1).data), "fence on the right").toBeGreaterThan(s.u * 0.1);
  });
});

// ---------------------------------------------------------------- standing on the ground

/** A drawing's separate pieces (8-connected pixels of a mask): size and lowest row of each with at least `min` pixels. */
function pieces(m: Uint8Array, W: number, H: number, min: number): { size: number; bottom: number; left: number; right: number }[] {
  const seen = new Uint8Array(m.length);
  const out: { size: number; bottom: number; left: number; right: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue;
    let size = 0;
    let bottom = 0;
    let left = W;
    let right = 0;
    seen[i] = 1;
    stack.push(i);
    while (stack.length) {
      const k = stack.pop()!;
      size++;
      const x = k % W;
      const y = (k - x) / W;
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (m[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    if (size >= min) out.push({ size, bottom, left, right });
  }
  return out;
}

/** The screens the footing is checked on: the two phones and a tablet. */
const FOOTING_SIZES: readonly (readonly [number, number])[] = [...SIZES, [1024, 1366]];
/** Moments: the parade and the waitress crossing, the dance (not mid-leap), the band at rest. */
const FOOTING_TIMES = [0.4, 3.3, 5.2, 8.3, 9.4, 12.5, 22.3] as const;

describe("oktoberfest footing", () => {
  // Nothing floats: every piece of everything that stands on the ground reaches its ground line
  // (the owner saw stall posts hanging in the air beside the path). Each prop is drawn alone and
  // split into its separate pieces; the lowest pixel of every piece must be on the line the prop
  // stands on, give or take an ink line (and a hop, for the dancers). The fence's posts and the
  // stalls' are planted in the grass in front, under a tuft each; the folk and the parade stand on
  // the trodden ground; the tent on the floor line behind the bandstand; the fair on the far line,
  // the village a little down the meadow in front of it; the maypole's foot is hidden behind the
  // tent's roof.
  it.each(FOOTING_SIZES.flatMap(([W, H]) => FOOTING_TIMES.map((t) => [W, H, t] as const)))("%ix%i at t+%s: everything stands on its ground", (W, H, t) => {
    const s = startScene(W, H, t);
    const u = s.u;
    const g = s.groundY;
    const tol = Math.max(2.5, u * 0.006);
    const min = Math.max(6, Math.round(u * u * 0.00004));
    const top = bandTop(s);
    const lw = inkW(s);
    const check = (name: string, draw: (ctx: CanvasRenderingContext2D) => void, feet: readonly number[], up = 0, minus?: Uint8Array) => {
      const m = mask(W, H, draw);
      if (minus) for (let i = 0; i < m.length; i++) if (minus[i]) m[i] = 0;
      const found = pieces(m, W, H, min);
      for (const p of found) {
        const near = feet.reduce((a, f) => (Math.abs(p.bottom - f) < Math.abs(p.bottom - a) ? f : a), feet[0]!);
        expect(p.bottom, `${name}: a piece (${p.size} px, x ${p.left}..${p.right}) ends at y ${p.bottom}, not on its ground at ${near.toFixed(1)}`).toBeGreaterThanOrEqual(near - tol - up);
        expect(p.bottom, `${name}: a piece (${p.size} px, x ${p.left}..${p.right}) sinks below its ground at ${near.toFixed(1)}`).toBeLessThanOrEqual(near + tol);
      }
      return found.length;
    };
    // In front: the fence and the two stalls (their smoke rises, so it is left out), on the grass line.
    const foot = frontFoot(s);
    expect(check("fence", (ctx) => fence(ctx, s, top, lw), [foot]), "the fence is drawn").toBeGreaterThan(0);
    expect(check("pretzel stall", (ctx) => pretzelStall(ctx, s, top, lw, 0), [foot])).toBeGreaterThan(0);
    const smoke = mask(W, H, (ctx) => stallSmoke(ctx, s, top));
    expect(check("sausage stall", (ctx) => sausageStall(ctx, s, top, lw, 0), [foot], 0, smoke)).toBeGreaterThan(0);
    // The folk and the parade on the trodden ground (the band bobs to the beat, the dancers hop).
    expect(check("band", (ctx) => band(ctx, s), [g + FOLK_LINE * u], u * 0.006)).toBeGreaterThan(0);
    expect(check("dancers", (ctx) => dancers(ctx, s), [g + FOLK_LINE * u], u * (0.01 + LEAP * dance(t).leap))).toBeGreaterThan(0);
    check("waitress", (ctx) => waitress(ctx, s), [g + WAITRESS_LINE * u], u * 0.004);
    // (The far horse of the pair walks a little further back, on its own line.)
    check("parade", (ctx) => parade(ctx, s), [g + PARADE_LINE * u, g + (PARADE_LINE - 0.03) * u], u * 0.004);
    // The tent on the floor line, the bandstand down to its step.
    expect(check("tent", (ctx) => tent(ctx, s, toneOf(s)), [g])).toBeGreaterThan(0);
    expect(check("bandstand", (ctx) => bandstand(ctx, s), [g + (SKIRT + 0.026) * u])).toBeGreaterThan(0);
    // The maypole's foot is behind the tent's roof.
    const pole = mask(W, H, (ctx) => maypole(ctx, s));
    const tentMask = mask(W, H, (ctx) => tent(ctx, s, toneOf(s)));
    let lowest = -1;
    for (let i = 0; i < pole.length; i++) if (pole[i]) lowest = Math.max(lowest, Math.floor(i / W));
    let hidden = 0;
    let shown = 0;
    for (let x = 0; x < W; x++) {
      if (!pole[lowest * W + x]) continue;
      if (tentMask[lowest * W + x]) hidden++;
      else shown++;
    }
    expect(hidden, "the maypole's foot is behind the tent").toBeGreaterThan(0);
    expect(shown, "the maypole's foot shows below the tent's roof").toBe(0);
    // The village and the fair on the far meadow.
    const far = farLine(s);
    const tone = toneOf(s);
    expect(check("church", (ctx) => church(ctx, s, tone, far), [far + u * VILLAGE_FOOT])).toBeGreaterThan(0);
    expect(check("house", (ctx) => house(ctx, s, tone, far), [far + u * VILLAGE_FOOT])).toBeGreaterThan(0);
    expect(check("ferris wheel", (ctx) => ferrisWheel(ctx, s, tone, far), [far + u * 0.014])).toBeGreaterThan(0);
    expect(check("chain carousel", (ctx) => swingRide(ctx, s, tone, far), [far + u * 0.014])).toBeGreaterThan(0);
    const tables = [0.075, 0.092, 0.108].map((d) => far + u * (d + 0.009 * (0.8 + (d - 0.075) * 6)));
    expect(check("beer garden", (ctx) => beerGarden(ctx, s, tone, far), tables)).toBeGreaterThan(0);
    expect(check("hay bales", (ctx) => hayBales(ctx, s, tone, far), [far + u * BALES_AT])).toBeGreaterThan(0);
  }, 60_000);

  it.each(FOOTING_SIZES)("%ix%i: the waitress and the parade are never cut off by the ground in front", (W, H) => {
    // They pass behind the stalls and the fence by design, but the trodden sand and the path in
    // front run the whole width of the screen: nothing of them, the waitress's shoes at the
    // bottom of her step included, may reach down under it (her feet once vanished into the path).
    const half = halfWidth(startScene(W, H, 0));
    let seen = 0;
    for (let t = 0; t < 60; t += 0.2) {
      const her = waitressAt(t, half).shown;
      const wagon = paradeAt(t, half).shown;
      if (!her && !wagon) continue;
      const s = startScene(W, H, t);
      const ground = mask(W, H, (ctx) => frontGround(ctx, s, bandTop(s)));
      if (her) expect(overlap(mask(W, H, (ctx) => waitress(ctx, s)), ground), `t=${t.toFixed(1)}: the waitress reaches under the ground in front`).toBe(0);
      if (wagon) expect(overlap(mask(W, H, (ctx) => parade(ctx, s)), ground), `t=${t.toFixed(1)}: the parade reaches under the ground in front`).toBe(0);
      seen++;
    }
    expect(seen, "moments checked").toBeGreaterThan(60);
  }, 120_000);

  it.each(SIZES)("%ix%i: every fence post and stall post runs from over the rail down into the grass", (W, H) => {
    // Down each post's middle the drawing is solid from its top to its foot in the grass (a
    // piece that reaches the ground by a sliver would pass the footing check above), and the
    // feet are sunk below the grass line, not left standing on its edge.
    expect(FOOT, "the feet are sunk into the grass").toBeGreaterThan(GRASS_AT + 0.01);
    const s = startScene(W, H, 0);
    const top = bandTop(s);
    const lw = inkW(s);
    const foot = Math.floor(frontFoot(s));
    const solid = (name: string, m: Uint8Array, x: number, from: number) => {
      let gaps = 0;
      for (let y = from; y <= foot; y++) if (!m[y * W + x]) gaps++;
      expect(gaps, `${name}: rows missing between its top and its foot`).toBe(0);
      expect(foot - from, `${name}: its height`).toBeGreaterThan(s.u * 0.08);
    };
    const fenceMask = mask(W, H, (ctx) => fence(ctx, s, top, lw));
    const railTop = Math.ceil(top - s.u * 0.04);
    for (const side of [-1, 1]) for (const X of FENCE_POSTS) solid(`the fence post at ${side * X} u`, fenceMask, Math.round(W / 2 + side * X * s.u), railTop);
    expect(FENCE_POSTS[0]).toBeGreaterThan(GATE);
    // The stalls' corner posts, from under the awning's hem down.
    const stalls = [mask(W, H, (ctx) => pretzelStall(ctx, s, top, lw, 0)), mask(W, H, (ctx) => sausageStall(ctx, s, top, lw, 0))];
    const hem = Math.ceil(top - s.u * (AWNING_UP - 0.05));
    [-1, 1].forEach((side, i) => {
      for (const X of [STALL_IN + POST_W / 2, STALL_OUT - POST_W / 2]) solid(`the stall post at ${side * X} u`, stalls[i]!, Math.round(W / 2 + side * X * s.u), hem);
    });
  });
});
