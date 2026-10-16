import { medalsToShow, type Achievement, type MedalKind, type Tier } from "./achievements";

// The medal art, drawn the same on the game-over card (canvas) and on the Achievements screen
// (inline SVG) from one geometry in a MEDAL_W × MEDAL_H box: a two-tone ribbon in a V, and a
// metal disc with the goal on it. Stack medals are round coins ("25"); perfect-streak medals are
// scalloped seals ("×9", like the PERFECT ×9 pop), so the kinds differ by shape, not only color.
// Bronze, silver, gold by tier; locked medals are a faint outline with the goal still readable.

export const MEDAL_W = 48;
export const MEDAL_H = 58;

type Pt = readonly [number, number];

const CX = 24;
const CY = 38;
/** The coin's radius, its inner face's, and the seal's points and inner face. */
const COIN_R = 16.5;
const FACE_R = 12.8;
const SEAL_OUT = 18.5;
const SEAL_IN = 16;
const SEAL_POINTS = 16;
const INK_W = 2.2;
/** The goal's type size, by digits (incl. the "×"), box units. */
const NUMBER_SIZE = [0, 15, 14, 11.5, 10];

/** The ribbon's straps: the back one (right, dark) and the front one (left, light). */
const STRAP_BACK: readonly Pt[] = [
  [29, 1.5],
  [41, 1.5],
  [30.5, 30],
  [18.5, 30],
];
const STRAP_FRONT: readonly Pt[] = [
  [7, 1.5],
  [19, 1.5],
  [29.5, 30],
  [17.5, 30],
];

const SEAL: readonly Pt[] = Array.from({ length: SEAL_POINTS * 2 }, (_, i) => {
  const r = i % 2 === 0 ? SEAL_OUT : SEAL_IN;
  const a = (i * Math.PI) / SEAL_POINTS - Math.PI / 2;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
});

export interface MetalColors {
  base: string;
  light: string;
  dark: string;
}

export const METALS: Record<Tier, MetalColors> = {
  bronze: { base: "#e39a5c", light: "#f8c896", dark: "#a95f2c" },
  silver: { base: "#cdd7e4", light: "#f7faff", dark: "#8794a8" },
  gold: { base: "#ffcd38", light: "#fff2a8", dark: "#d08a00" },
};

/** Ribbon colors by kind: [front, back]. Blue for stacks, red for perfect streaks. */
export const RIBBONS: Record<MedalKind, readonly [string, string]> = {
  stack: ["#3b82f0", "#2155b8"],
  perfect: ["#ef4a5f", "#b02a40"],
};

const INK = "#000000";
/** Locked: opaque (so the ribbon doesn't show through the disc), dim and cool, on the dark sheet. */
const LOCKED = { fill: "#2c2640", face: "#241f35", line: "#6a6286", text: "#a29bbd" };

/** What the medal shows: "25" for a stack, "×9" for a perfect streak. */
export function medalNumber(a: Pick<Achievement, "kind" | "goal">): string {
  return a.kind === "perfect" ? `×${a.goal}` : String(a.goal);
}

function numberSize(text: string): number {
  return NUMBER_SIZE[Math.min(text.length, NUMBER_SIZE.length - 1)]!;
}

// --- SVG (the Achievements screen) ---

const f = (n: number) => String(Math.round(n * 100) / 100);
const pts = (list: readonly Pt[]) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");

/** Inline SVG for a medal, earned (in its metal) or locked (an outline). Decorative: aria-hidden. */
export function medalSvg(a: Achievement, earned: boolean): string {
  const [front, back] = RIBBONS[a.kind];
  const m = METALS[a.tier];
  const fill = (c: string) => (earned ? c : LOCKED.fill);
  const line = earned ? INK : LOCKED.line;
  const stroke = `stroke="${line}" stroke-width="${earned ? INK_W : 1.5}" stroke-linejoin="round"`;
  const body =
    a.kind === "stack"
      ? `<circle cx="${CX}" cy="${CY}" r="${COIN_R}" fill="${fill(m.dark)}" ${stroke}/>`
      : `<polygon points="${pts(SEAL)}" fill="${fill(m.dark)}" ${stroke}/>`;
  const face = `<circle cx="${CX}" cy="${CY}" r="${FACE_R}" fill="${earned ? m.base : LOCKED.face}"/>`;
  const shine = earned ? `<ellipse cx="18.6" cy="32" rx="4.6" ry="2.4" transform="rotate(-35 18.6 32)" fill="${m.light}"/>` : "";
  const text = medalNumber(a);
  const type = earned
    ? `fill="#ffffff" stroke="${INK}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"`
    : `fill="${LOCKED.text}"`;
  return (
    `<svg class="medal" viewBox="0 0 ${MEDAL_W} ${MEDAL_H}" aria-hidden="true" focusable="false">` +
    `<polygon points="${pts(STRAP_BACK)}" fill="${fill(back)}" ${stroke}/>` +
    `<polygon points="${pts(STRAP_FRONT)}" fill="${fill(front)}" ${stroke}/>` +
    body +
    face +
    shine +
    `<text x="${CX}" y="${CY}" dy="0.36em" text-anchor="middle" font-size="${numberSize(text)}" font-weight="700" ${type}>${text}</text>` +
    `</svg>`
  );
}

// --- Canvas (the game-over card) ---

type Ctx = CanvasRenderingContext2D;

function polygon(ctx: Ctx, list: readonly Pt[]): void {
  ctx.beginPath();
  list.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function disc(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.arc(CX, CY, r, 0, Math.PI * 2);
}

function fillInk(ctx: Ctx, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = INK_W;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** An earned medal with its box's top-left at (x, y) and `w` CSS px wide, its goal in `font`. */
export function drawMedal(ctx: Ctx, a: Achievement, x: number, y: number, w: number, font: string): void {
  const k = w / MEDAL_W;
  const [front, back] = RIBBONS[a.kind];
  const m = METALS[a.tier];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  polygon(ctx, STRAP_BACK);
  fillInk(ctx, back);
  polygon(ctx, STRAP_FRONT);
  fillInk(ctx, front);
  if (a.kind === "stack") disc(ctx, COIN_R);
  else polygon(ctx, SEAL);
  fillInk(ctx, m.dark);
  disc(ctx, FACE_R);
  ctx.fillStyle = m.base;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18.6, 32, 4.6, 2.4, (-35 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fillStyle = m.light;
  ctx.fill();
  const text = medalNumber(a);
  ctx.font = `700 ${numberSize(text)}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, CX, CY + 0.5);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, CX, CY + 0.5);
  ctx.restore();
}

/** The game-over card's new-medal row shows at most this many medals (then "+n"). */
export const STRIP_MAX = 5;
/** A medal's width on the card, in u, and the step between medals. */
const STRIP_MEDAL = 0.125;
const STRIP_STEP = 0.15;
/** The row's gap above the card, and the label's gap above the row, in u. */
const STRIP_GAP = 0.02;
const LABEL_GAP = 0.025;
/** Pop-in: the first medal after this long on the card, the next ones this much later, each over POP_TIME (s). */
const POP_DELAY = 0.15;
const POP_STAGGER = 0.09;
const POP_TIME = 0.3;

/** Overshoot ease for the pop-in (0 → 1, a little past 1 on the way). */
function backOut(k: number): number {
  const c = 1.7;
  const t = k - 1;
  return 1 + (c + 1) * t * t * t + c * t * t;
}

/** How grown medal `i` of the row is, `age` seconds after the card came up: 0 → 1 (with overshoot). */
export function popScale(i: number, age: number): number {
  const k = (age - POP_DELAY - i * POP_STAGGER) / POP_TIME;
  if (k <= 0) return 0;
  return k >= 1 ? 1 : backOut(k);
}

export interface MedalStrip {
  /** The run's new medals, in the order earned. */
  medals: readonly Achievement[];
  /** The game-over card's box, CSS px. */
  card: { x: number; y: number; w: number; h: number };
  u: number;
  /** Seconds the card has been up (Infinity: no animation). */
  age: number;
  /** The HUD's text style (kit.text), body font and highlight color. */
  text(t: string, x: number, y: number, fill: string, outline: number): void;
  font: string;
  accent: string;
}

/**
 * The run's new medals in a row just above the game-over card, under a "New medal!" line, popping
 * in one after another. The space above the card is empty on game over (at least 0.39 u tall:
 * the card's top sits at 0.42 of the screen less 0.31 u, and u is at most 0.6 of it).
 */
export function drawMedalStrip(ctx: Ctx, s: MedalStrip): void {
  const total = s.medals.length;
  if (total === 0) return;
  // Too many to show: the best of them and "+n" for the rest.
  const shown = medalsToShow(s.medals, total <= STRIP_MAX ? STRIP_MAX : STRIP_MAX - 1);
  const { u, card } = s;
  const more = total - shown.length;
  const slots = shown.length + (more > 0 ? 1 : 0);
  const w = u * STRIP_MEDAL;
  const h = (w * MEDAL_H) / MEDAL_W;
  const step = u * STRIP_STEP;
  const bottom = card.y - u * STRIP_GAP;
  const top = bottom - h;
  const cx = card.x + card.w / 2;
  const slotX = (i: number) => cx + (i - (slots - 1) / 2) * step;

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, s.age / POP_DELAY));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${Math.round(u * 0.046)}px ${s.font}`;
  s.text(total === 1 ? "New medal!" : `${total} new medals!`, cx, top - u * LABEL_GAP, s.accent, u * 0.011);
  ctx.restore();

  shown.forEach((a, i) => {
    const k = popScale(i, s.age);
    if (k <= 0) return;
    const x = slotX(i);
    ctx.save();
    // Grow from the ribbon's top, where it hangs.
    ctx.translate(x, top);
    ctx.scale(k, k);
    drawMedal(ctx, a, -w / 2, 0, w, s.font);
    ctx.restore();
  });

  if (more > 0) {
    const k = popScale(shown.length, s.age);
    if (k > 0) {
      ctx.save();
      ctx.translate(slotX(slots - 1), top + h * 0.62);
      ctx.scale(k, k);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(u * 0.05)}px ${s.font}`;
      s.text(`+${more}`, 0, 0, "#ffffff", u * 0.011);
      ctx.restore();
    }
  }
}
