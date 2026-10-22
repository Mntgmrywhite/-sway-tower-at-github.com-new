import { circle, ink, oval, type Ctx } from "../../base/draw";
import { CROWN_GLOW, FERN, FLAME_LIGHT, GLASS, GOLD, INK, IRON, LAMPLIT, PAPER_LIT, PAPER_SHEEN, PEARL, PLUMES, PURPLE, TERRACOTTA, THREE, type Shades } from "./colors";
import { block, fleurPath, maskEyes, maskPath, swagPath } from "./shapes";

// The dressing of the Quarter's houses, shared by the street, the café and the stand: lacy
// cast-iron railings and posts, lace friezes under the galleries, ferns in hanging baskets,
// strings of beads looped over the rails, bunting swags, Carnival banners, gas lanterns, big
// feathered masks and a papier-mâché crown. Near things: flat fills, a lit top and a shaded
// underside, one ink weight. Everything that moves takes the scene's clock and its own phase, so
// no two sway in step; callers keep the moving things out of the tower's column.

/** A gallery's rail for the batched helpers: its span (px), the y of its foot, and which color its beads and bunting start on. */
export interface Rail {
  x0: number;
  x1: number;
  y: number;
  first: number;
}

/** Scratch rails: callers fill the first `n` and pass them to `railings`, `beadsOn` and `buntings`. */
export const RAILS: Rail[] = Array.from({ length: 8 }, () => ({ x0: 0, x1: 0, y: 0, first: 0 }));
/** A single rail, for the one-rail helpers. */
const ONE: Rail[] = [{ x0: 0, x1: 0, y: 0, first: 0 }];

function one(x0: number, x1: number, y: number, first: number): Rail[] {
  const r = ONE[0]!;
  r.x0 = x0;
  r.x1 = x1;
  r.y = y;
  r.first = first;
  return ONE;
}

/**
 * Iron railings, `h` tall, along the first `n` rails, all at once: a top and a bottom rail,
 * balusters, and a row of little round bosses for the lace; a lit edge along the top; one ink
 * outline round each.
 */
export function railings(ctx: Ctx, u: number, rails: readonly Rail[], n: number, h: number, lw: number): void {
  const step = u * 0.0125;
  ctx.fillStyle = IRON.body;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const { x0, x1, y } = rails[i]!;
    ctx.rect(x0, y - h, x1 - x0, u * 0.0055);
    ctx.rect(x0, y - u * 0.0055, x1 - x0, u * 0.0055);
    for (let x = x0 + step * 0.5; x < x1; x += step) ctx.rect(x - u * 0.0012, y - h, u * 0.0024, h);
    for (let x = x0 + step; x < x1 - step * 0.5; x += step * 2) circle(ctx, x, y - h * 0.5, step * 0.36);
  }
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const { x0, x1, y } = rails[i]!;
    ctx.rect(x0, y - h, x1 - x0, Math.max(1, u * 0.0018));
  }
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const { x0, x1, y } = rails[i]!;
    ctx.rect(x0, y - h, x1 - x0, h);
  }
  ink(ctx, lw * 0.6, INK);
}

/** One railing (see `railings`). */
export function railing(ctx: Ctx, u: number, x0: number, x1: number, y: number, h: number, lw: number): void {
  railings(ctx, u, one(x0, x1, y, 0), 1, h, lw);
}

/** Adds slim iron posts from `top` down to `foot` at the given xs to the current path. */
export function postsPath(ctx: Ctx, u: number, xs: readonly number[], top: number, foot: number): void {
  const w = u * 0.0062;
  for (const x of xs) ctx.rect(x - w / 2, top, w, foot - top);
}

/** Adds the posts' lit edges to the current path. */
export function postsLit(ctx: Ctx, u: number, xs: readonly number[], top: number, foot: number, lw: number): void {
  const w = u * 0.0062;
  for (const x of xs) ctx.rect(x - w / 2 + lw * 0.4, top, Math.max(1, w * 0.25), foot - top);
}

/**
 * Adds a lace frieze hung under a deck from x0 to x1 at y (the deck's underside) to the current
 * path: a band with a row of little arches, and a curly bracket either side of each post.
 */
export function friezePath(ctx: Ctx, u: number, x0: number, x1: number, y: number, postsAt: readonly number[]): void {
  const h = u * 0.012;
  ctx.rect(x0, y, x1 - x0, u * 0.004);
  const step = u * 0.012;
  for (let x = x0 + step / 2; x < x1 - step * 0.3; x += step) {
    ctx.moveTo(x - step / 2, y + u * 0.003);
    ctx.quadraticCurveTo(x, y + h * 1.3, x + step / 2, y + u * 0.003);
    ctx.lineTo(x + step / 2 - u * 0.002, y + u * 0.003);
    ctx.quadraticCurveTo(x, y + h * 0.9, x - step / 2 + u * 0.002, y + u * 0.003);
    ctx.closePath();
  }
  for (const px of postsAt) {
    for (const m of [-1, 1]) {
      if ((m < 0 && px - u * 0.02 < x0 - 1) || (m > 0 && px + u * 0.02 > x1 + 1)) continue;
      ctx.moveTo(px, y);
      ctx.lineTo(px + m * u * 0.022, y);
      ctx.quadraticCurveTo(px + m * u * 0.006, y + u * 0.006, px + m * u * 0.003, y + u * 0.024);
      ctx.lineTo(px, y + u * 0.024);
      ctx.closePath();
    }
  }
}

/** Adds the frieze brackets' lit bosses to the current path. */
export function friezeDots(ctx: Ctx, u: number, x0: number, x1: number, y: number, postsAt: readonly number[]): void {
  for (const px of postsAt) {
    for (const m of [-1, 1]) {
      if ((m < 0 && px - u * 0.02 < x0 - 1) || (m > 0 && px + u * 0.02 > x1 + 1)) continue;
      circle(ctx, px + m * u * 0.009, y + u * 0.008, u * 0.0028);
    }
  }
}

/** A lace frieze, filled (see `friezePath`). */
export function frieze(ctx: Ctx, u: number, x0: number, x1: number, y: number, postsAt: readonly number[]): void {
  ctx.fillStyle = IRON.body;
  ctx.beginPath();
  friezePath(ctx, u, x0, x1, y, postsAt);
  ctx.fill();
  ctx.fillStyle = IRON.light;
  ctx.beginPath();
  friezeDots(ctx, u, x0, x1, y, postsAt);
  ctx.fill();
}

/** A fern to hang: its hook (px), its size (px: about the basket's width) and how far it swings (radians). */
export interface Fern {
  x: number;
  y: number;
  k: number;
  a: number;
}

/** Scratch for the ferns' places: callers fill it and pass it to `hangingFerns`. */
export const FERNS: Fern[] = Array.from({ length: 16 }, () => ({ x: 0, y: 0, k: 0, a: 0 }));

/**
 * Ferns in hanging baskets, each on a short chain from its hook (a gallery's ceiling): a round
 * mound of leaves over a terracotta basket, long fronds arching out and drooping either side,
 * swinging about the hook. All of them together in a handful of fills (the first `n` of `list`).
 */
export function hangingFerns(ctx: Ctx, list: readonly Fern[], n: number, lw: number): void {
  if (n <= 0) return;
  let cos = 1;
  let sin = 0;
  let ox = 0;
  let oy = 0;
  const X = (px: number, py: number) => ox + px * cos - py * sin;
  const Y = (px: number, py: number) => oy + px * sin + py * cos;
  const set = (f: Fern) => {
    cos = Math.cos(f.a);
    sin = Math.sin(f.a);
    ox = f.x;
    oy = f.y;
  };
  // The chains.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const f = list[i]!;
    set(f);
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(X(0, f.k * 0.45), Y(0, f.k * 0.45));
  }
  ctx.strokeStyle = IRON.body;
  ctx.lineWidth = Math.max(1, lw * 0.35);
  ctx.stroke();
  // The fronds and the mounds: their outline first (a wide ink stroke the fill then covers on the
  // inside), one fill over it.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const f = list[i]!;
    const k = f.k;
    set(f);
    const by = k * 0.6;
    for (const m of [-1, 1]) {
      for (let j = 0; j < 2; j++) {
        const out = k * (0.6 + j * 0.32);
        const down = k * (0.42 + j * 0.42);
        ctx.moveTo(X(m * k * 0.15, by), Y(m * k * 0.15, by));
        ctx.quadraticCurveTo(X(m * out, by - k * 0.12), Y(m * out, by - k * 0.12), X(m * out * 1.05, by + down), Y(m * out * 1.05, by + down));
        ctx.quadraticCurveTo(X(m * out * 0.7, by + k * 0.05), Y(m * out * 0.7, by + k * 0.05), X(m * k * 0.1, by + k * 0.12), Y(m * k * 0.1, by + k * 0.12));
        ctx.closePath();
      }
    }
    circle(ctx, X(-k * 0.24, by), Y(-k * 0.24, by), k * 0.26);
    circle(ctx, X(k * 0.24, by), Y(k * 0.24, by), k * 0.26);
    circle(ctx, X(0, by - k * 0.12), Y(0, by - k * 0.12), k * 0.3);
  }
  ink(ctx, lw, INK);
  ctx.fillStyle = FERN.body;
  ctx.fill();
  ctx.fillStyle = FERN.light;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const f = list[i]!;
    const k = f.k;
    set(f);
    const by = k * 0.6;
    oval(ctx, X(-k * 0.1, by - k * 0.22), Y(-k * 0.1, by - k * 0.22), k * 0.16, k * 0.09, f.a - 0.3);
    oval(ctx, X(k * 0.26, by - k * 0.04), Y(k * 0.26, by - k * 0.04), k * 0.1, k * 0.06, f.a + 0.2);
  }
  ctx.fill();
  // The baskets.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const f = list[i]!;
    const k = f.k;
    set(f);
    const by = k * 0.6;
    ctx.moveTo(X(-k * 0.3, by + k * 0.08), Y(-k * 0.3, by + k * 0.08));
    ctx.lineTo(X(k * 0.3, by + k * 0.08), Y(k * 0.3, by + k * 0.08));
    ctx.quadraticCurveTo(X(k * 0.26, by + k * 0.36), Y(k * 0.26, by + k * 0.36), X(0, by + k * 0.38), Y(0, by + k * 0.38));
    ctx.quadraticCurveTo(X(-k * 0.26, by + k * 0.36), Y(-k * 0.26, by + k * 0.36), X(-k * 0.3, by + k * 0.08), Y(-k * 0.3, by + k * 0.08));
    ctx.closePath();
  }
  ctx.fillStyle = TERRACOTTA;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

/**
 * Strings of beads looped over the first `n` rails, hanging from each rail's y: each loop swings a
 * little on its own (by `t` and its place), in the three colors by turns. Drawn as strokes: the
 * strings in ink under all of them at once, then each color's beads as round dots along its
 * loops (a dashed stroke with round caps), so any number of rails' beads cost four strokes.
 */
export function beadsOn(ctx: Ctx, u: number, rails: readonly Rail[], n: number, lw: number, t: number, depth = 0.03, step = 0.058): void {
  const s = u * step;
  const r = u * 0.0036;
  const hw = u * 0.011;
  const d = u * depth * 1.33;
  const loops = (c: number) => {
    for (let j = 0; j < n; j++) {
      const { x0, x1, y, first } = rails[j]!;
      const m = Math.max(1, Math.floor((x1 - x0 - s * 0.4) / s));
      const off = (x1 - x0 - (m - 1) * s) / 2;
      for (let i = 0; i < m; i++) {
        if (c >= 0 && (i + first) % 3 !== c) continue;
        const x = x0 + off + i * s;
        const dx = Math.sin(t * 1.3 + i * 1.9 + first) * u * 0.005;
        ctx.moveTo(x - hw, y);
        ctx.bezierCurveTo(x - hw + dx * 0.6, y + d, x + hw + dx * 0.6, y + d, x + hw, y);
      }
    }
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  loops(-1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 2 + lw * 0.6;
  ctx.stroke();
  ctx.lineWidth = r * 2;
  BEAD_DASH[1] = r * 2.35;
  ctx.setLineDash(BEAD_DASH);
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    loops(c);
    ctx.strokeStyle = THREE[c]!.body;
    ctx.stroke();
  }
  ctx.setLineDash(NO_DASH);
}

/** The beads' dash: a dot (a zero-length dash with round caps), then a gap; reused every call. */
const BEAD_DASH = [0.001, 1];
const NO_DASH: number[] = [];

/** Beads on one rail (see `beadsOn`). */
export function beadStrings(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number, first: number, t: number, depth = 0.03, step = 0.058): void {
  beadsOn(ctx, u, one(x0, x1, y, first), 1, lw, t, depth, step);
}

/** Bunting swags along the tops of the first `n` rails (`h` above each rail's y), in the three colors by turns, gold rosettes where they meet. */
export function buntings(ctx: Ctx, u: number, rails: readonly Rail[], n: number, h: number, lw: number, sag = 0.012): void {
  const each = (f: (x0: number, span: number, i: number, y: number, first: number) => void) => {
    for (let j = 0; j < n; j++) {
      const { x0, x1, y, first } = rails[j]!;
      const m = Math.max(2, Math.round((x1 - x0) / (u * 0.062)));
      const span = (x1 - x0) / m;
      for (let i = 0; i < m; i++) f(x0, span, i, y - h, first);
      if (f === rosette) f(x0, span, m, y - h, first);
    }
  };
  const rosette = (x0: number, span: number, i: number, y: number) => circle(ctx, x0 + i * span, y + u * 0.002, u * 0.0058);
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    each((x0, span, i, y, first) => {
      if ((i + first) % 3 === c) swagPath(ctx, x0 + i * span, x0 + (i + 1) * span, y, u * sag);
    });
    ctx.fillStyle = THREE[c]!.body;
    ctx.fill();
    ctx.beginPath();
    each((x0, span, i, y, first) => {
      if ((i + first) % 3 !== c) return;
      const a = x0 + i * span;
      ctx.moveTo(a + span * 0.15, y + u * 0.003);
      ctx.quadraticCurveTo(a + span * 0.5, y + u * sag, a + span * 0.85, y + u * 0.003);
      ctx.quadraticCurveTo(a + span * 0.5, y + u * sag * 0.5, a + span * 0.15, y + u * 0.003);
      ctx.closePath();
    });
    ctx.fillStyle = THREE[c]!.light;
    ctx.fill();
  }
  ctx.beginPath();
  each((x0, span, i, y) => swagPath(ctx, x0 + i * span, x0 + (i + 1) * span, y, u * sag));
  ink(ctx, lw * 0.6, INK);
  ctx.fillStyle = GOLD.shade;
  ctx.beginPath();
  each(rosette);
  ctx.fill();
}

/** Bunting along one rail's top at y (see `buntings`). */
export function bunting(ctx: Ctx, u: number, x0: number, x1: number, y: number, lw: number, first: number, sag = 0.012): void {
  buntings(ctx, u, one(x0, x1, y, first), 1, 0, lw, sag);
}

/**
 * A Carnival banner hung from a pole at (x, y) (the middle of its top edge): three long stripes
 * (purple, green, gold) ending in a swallowtail, a gold fleur-de-lis on it, its tail fluttering
 * by `t`. `w` and `h` are its width and length (px).
 */
export function banner(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, phase: number, lw: number, emblem: "fleur" | "mask" = "fleur"): void {
  const wave = (f: number) => Math.sin(t * 2.6 + phase - f * 3) * w * 0.14 * f;
  /** The swallowtail: how far down the bottom edge reaches at `xf` across (0..1): the sides longest, notched in the middle. */
  const tail = (xf: number) => h * (1 - 0.2 * (1 - Math.abs(xf * 2 - 1)));
  const STEPS = 4;
  const side = (xf: number, down: boolean) => {
    for (let i = 0; i <= STEPS; i++) {
      const f = down ? i / STEPS : 1 - i / STEPS;
      const yy = y + tail(xf) * f;
      ctx.lineTo(x - w / 2 + w * xf + wave(f), yy);
    }
  };
  for (let c = 0; c < 3; c++) {
    const a = c / 3;
    const b = (c + 1) / 3;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + w * a, y);
    side(a, true);
    ctx.lineTo(x - w / 2 + w * 0.5 + wave(1), y + tail(0.5));
    side(b, false);
    ctx.closePath();
    ctx.fillStyle = THREE[c]!.body;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  side(0, true);
  ctx.lineTo(x + wave(1), y + tail(0.5));
  side(1, false);
  ctx.closePath();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  if (emblem === "fleur") fleurPath(ctx, x + wave(0.35), y + h * 0.34, w * 0.62);
  else {
    maskPath(ctx, x + wave(0.35), y + h * 0.34, w * 0.8);
    maskEyes(ctx, x + wave(0.35), y + h * 0.34, w * 0.8);
  }
  ctx.fill("evenodd");
  ink(ctx, lw * 0.4, INK);
  ctx.fillStyle = GOLD.body;
  ctx.fillRect(x - w / 2 - lw, y - lw, w + lw * 2, lw * 2);
}

/** A paper lantern to hang: where its string meets the lantern (px), its size (px: half its width) and how far it rocks (radians). */
export interface PaperLantern {
  x: number;
  y: number;
  k: number;
  a: number;
  color: number;
}

/** Scratch for paper lanterns: callers fill the first `n` and pass them to `paperLanterns`. */
export const LANTERN_SPOTS: PaperLantern[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, k: 0, a: 0, color: 0 }));

/**
 * Round paper lanterns hung from a string, each rocking a little on its own (`a`), in the
 * three colors: dark caps top and bottom, ribs down the paper, and by night (`lit`) a warm glow
 * from within. All of them in a handful of fills.
 */
export function paperLanterns(ctx: Ctx, list: readonly PaperLantern[], n: number, lit: number, lw: number): void {
  if (n <= 0) return;
  const at = (l: PaperLantern, px: number, py: number): [number, number] => {
    const c = Math.cos(l.a);
    const sn = Math.sin(l.a);
    return [l.x + px * c - py * sn, l.y + px * sn + py * c];
  };
  // The outlines under everything, then the paper in each color, then the caps and the glow.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = list[i]!;
    const [cx, cy] = at(l, 0, l.k * 1.1);
    oval(ctx, cx, cy, l.k, l.k * 0.9, l.a);
  }
  ink(ctx, lw, INK);
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const l = list[i]!;
      if (l.color % 3 !== c) continue;
      const [cx, cy] = at(l, 0, l.k * 1.1);
      oval(ctx, cx, cy, l.k, l.k * 0.9, l.a);
    }
    ctx.fillStyle = lit > 0.3 ? THREE[c]!.light : THREE[c]!.body;
    ctx.fill();
  }
  ctx.fillStyle = lit > 0.3 ? PAPER_LIT : PAPER_SHEEN;
  ctx.globalAlpha = lit > 0.3 ? 0.4 + lit * 0.5 : 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = list[i]!;
    const [cx, cy] = at(l, -l.k * 0.25, l.k * 0.9);
    oval(ctx, cx, cy, l.k * (lit > 0.3 ? 0.55 : 0.28), l.k * (lit > 0.3 ? 0.55 : 0.4), l.a);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const l = list[i]!;
    const [tx, ty] = at(l, 0, l.k * 0.22);
    const [bx, by] = at(l, 0, l.k * 2.0);
    oval(ctx, tx, ty, l.k * 0.4, l.k * 0.14, l.a);
    oval(ctx, bx, by, l.k * 0.32, l.k * 0.12, l.a);
  }
  ctx.fill();
}

/**
 * A gas lantern on a bracket at (x, y) (its top): a four-sided glass box with a pointed cap, its
 * flame flickering (`t`, `phase`), lit warm (`lit` 0..1: by day a pale glass, by night glowing).
 * `k` is its width (px).
 */
export function lantern(ctx: Ctx, x: number, y: number, k: number, lit: number, t: number, phase: number, lw: number, flicker = true): void {
  ctx.beginPath();
  ctx.moveTo(x - k * 0.42, y + k * 0.2);
  ctx.lineTo(x - k * 0.36, y + k * 1.0);
  ctx.lineTo(x + k * 0.36, y + k * 1.0);
  ctx.lineTo(x + k * 0.42, y + k * 0.2);
  ctx.closePath();
  ctx.fillStyle = lit > 0.05 ? LAMPLIT : GLASS;
  ctx.fill();
  ink(ctx, lw * 0.6, INK);
  const f = flicker ? 0.75 + 0.25 * Math.sin(t * 9 + phase) * Math.sin(t * 4.3 + phase * 2) : 1;
  ctx.fillStyle = FLAME_LIGHT;
  ctx.globalAlpha = 0.5 + 0.5 * Math.max(lit, 0.3) * f;
  ctx.beginPath();
  oval(ctx, x, y + k * 0.62, k * 0.12 * f, k * 0.2 * f);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = IRON.body;
  ctx.beginPath();
  ctx.moveTo(x - k * 0.55, y + k * 0.2);
  ctx.lineTo(x, y - k * 0.22);
  ctx.lineTo(x + k * 0.55, y + k * 0.2);
  ctx.closePath();
  ctx.rect(x - k * 0.06, y + k * 0.2, k * 0.12, k * 0.8);
  ctx.rect(x - k * 0.4, y + k * 0.96, k * 0.8, k * 0.12);
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
}

/**
 * A big masquerade mask hung on a wall or a frieze, centered at (x, y), `w` wide: gold-trimmed in
 * the given color, its eye holes dark, with a fan of three plumes rising from its brow that
 * tremble (`t`, `phase`), and a gold jewel at the brow.
 */
export function bigMask(ctx: Ctx, x: number, y: number, w: number, color: Shades, t: number, phase: number, lw: number, tremble = true): void {
  const h = w * 0.42;
  // The plumes, behind the mask: three feathers fanning up from the brow, each with a lit vane,
  // inked all together.
  const plume = (i: number, inner: boolean) => {
    const a = -0.5 + i * 0.5 + (tremble ? Math.sin(t * 5 + phase + i * 1.7) * 0.05 : 0);
    const len = w * (i === 1 ? 0.9 : 0.72);
    const tipX = x + Math.sin(a) * len;
    const tipY = y - h * 0.3 - Math.cos(a) * len;
    const k = inner ? 0.45 : 1;
    ctx.moveTo(x - w * 0.03 * k, y - h * 0.25);
    ctx.quadraticCurveTo(x + Math.sin(a - 0.4 * k) * len * 0.6 - w * 0.1 * k, y - h * 0.3 - Math.cos(a - 0.4 * k) * len * 0.6, tipX, tipY);
    ctx.quadraticCurveTo(x + Math.sin(a + 0.4 * k) * len * 0.6 + w * 0.1 * k, y - h * 0.3 - Math.cos(a + 0.4 * k) * len * 0.6, x + w * 0.03 * k, y - h * 0.25);
    ctx.closePath();
  };
  ctx.beginPath();
  for (let i = 0; i < 3; i++) plume(i, false);
  ink(ctx, lw, INK);
  for (let i = 0; i < 3; i++) {
    const p = PLUMES[i % PLUMES.length]!;
    ctx.beginPath();
    plume(i, false);
    ctx.fillStyle = p.body;
    ctx.fill();
    ctx.beginPath();
    plume(i, true);
    ctx.fillStyle = p.light;
    ctx.fill();
  }
  ctx.beginPath();
  maskPath(ctx, x, y, w);
  maskEyes(ctx, x, y, w);
  ctx.fillStyle = color.body;
  ctx.fill("evenodd");
  ink(ctx, lw * 0.7, INK);
  // Gold trim round the eyes, a lit sweep on the left cheek, and the jewel.
  ctx.strokeStyle = GOLD.body;
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.beginPath();
  maskEyes(ctx, x, y, w);
  ctx.stroke();
  ctx.fillStyle = color.light;
  ctx.beginPath();
  oval(ctx, x - w * 0.3, y + h * 0.18, w * 0.1, h * 0.12, -0.4);
  ctx.fill();
  ctx.fillStyle = GOLD.light;
  ctx.beginPath();
  circle(ctx, x, y - h * 0.18, w * 0.05);
  ctx.fill();
  ink(ctx, lw * 0.4, INK);
}

/**
 * A papier-mâché crown standing on (x, y), `w` wide: a gold band with five points tipped with
 * pearls, jewels in purple and green on the band, lit on its left.
 */
export function crown(ctx: Ctx, x: number, y: number, w: number, lw: number, glow: number): void {
  const h = w * 0.62;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h * 0.55);
  for (let i = 0; i < 5; i++) {
    const px = x - w / 2 + (w * (i + 0.5)) / 5;
    const tall = i === 2 ? 1 : i % 2 ? 0.82 : 0.9;
    ctx.lineTo(px - w * 0.06, y - h * 0.5);
    ctx.lineTo(px, y - h * tall);
    ctx.lineTo(px + w * 0.06, y - h * 0.5);
  }
  ctx.lineTo(x + w / 2, y - h * 0.55);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = GOLD.body;
  ctx.fill();
  ink(ctx, lw * 0.7, INK);
  ctx.fillStyle = GOLD.light;
  ctx.fillRect(x - w / 2 + lw * 0.5, y - h * 0.5, w * 0.3, h * 0.48);
  ctx.beginPath();
  block(ctx, x - w / 2, y - h * 0.32, w, h * 0.2, h * 0.04);
  ctx.fillStyle = PURPLE.body;
  ctx.fill();
  ink(ctx, lw * 0.5, INK);
  ctx.fillStyle = PEARL;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const px = x - w / 2 + (w * (i + 0.5)) / 5;
    const tall = i === 2 ? 1 : i % 2 ? 0.82 : 0.9;
    circle(ctx, px, y - h * tall, w * 0.04);
  }
  ctx.fill();
  ink(ctx, lw * 0.4, INK);
  const jewels = [THREE[1]!.body, GOLD.light, THREE[1]!.body];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = jewels[i]!;
    ctx.beginPath();
    oval(ctx, x - w * 0.25 + i * w * 0.25, y - h * 0.22, w * 0.05, h * 0.06);
    ctx.fill();
  }
  if (glow > 0.05) {
    ctx.fillStyle = CROWN_GLOW;
    ctx.globalAlpha = glow * 0.6;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const px = x - w / 2 + (w * (i + 0.5)) / 5;
      const tall = i === 2 ? 1 : i % 2 ? 0.82 : 0.9;
      circle(ctx, px, y - h * tall, w * 0.022);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
