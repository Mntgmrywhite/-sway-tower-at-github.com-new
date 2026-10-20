import { mix, type Ctx } from "../../base/draw";
import { INK, tone, type Tone } from "./colors";
import { cupTray, dishStack, pie, turkeyPlatter } from "./dishes";
import { C, flat, len, line, M, O, pen, Q, S } from "./pen";
import type { Holding } from "./supper";

// The family of the hollow in their everyday autumn clothes, in the skin's warm comic-strip
// style: round heads with dot eyes, a smile and rosy cheeks, flat colors with a lit top and an
// inked outline, arms and legs as inked strokes. Grandma in her cardigan and apron, Dad in a
// knitted sweater, Mom with a long striped scarf, a girl in a jumper dress and braids, a boy in
// a striped shirt, and the neighbor from up the lane in his knit cap and a quilted vest. Our own
// people, no costumes. Each figure is drawn in local units (the table's, 1 = u at the tower's
// depth) with its feet at the origin, facing us or walking away; `size` scales it (the family
// coming down the garden path start small by the porch door).

export interface Look {
  kid: boolean;
  skin: string;
  hair: string;
  /** Grandma's bun, Dad's short cut, Mom's long hair, the girl's braids, the boy's mop, or tucked under a knit cap. */
  hairdo: "bun" | "short" | "long" | "braids" | "mop" | "cap";
  /** The sweater, cardigan, shirt, vest or dress: what covers the body. */
  top: Tone;
  /** The arms: the top's sleeves, or the shirt's under a vest or jumper dress. */
  sleeve: string;
  /** The top's own look: plain, a knitted band across the chest, a cardigan's buttons, stripes, a quilted vest over a shirt, a jumper dress's round collar. */
  trim: "plain" | "band" | "cardigan" | "stripes" | "vest" | "jumper";
  /** The band's, the stripes' or the shirt collar's color. */
  trimColor: string;
  /** Below the waist: a long skirt, a skirt to the knee over tights, or trousers. */
  legs: "long" | "knee" | "trousers";
  /** The skirt or the trousers. */
  bottom: string;
  /** Tights under a skirt to the knee. */
  tights: string;
  shoe: string;
  apron: boolean;
  /** A long scarf wound round the neck, its ends hanging down the front. */
  scarf: string | null;
  /** A knit cap. */
  cap: string | null;
  glasses: boolean;
  mustache: boolean;
}

const WHITE = "#fffaf0";
const CREAM = "#fff1d6";
const CHEEK = "rgba(240, 110, 100, 0.45)";
const TRIM_RED = "#e2443a";
/** The stripes near the ends of Mom's scarf. */
const SCARF_STRIPE = "#ffd94a";
const BOBBLE = "#4fa05a";
/** The rolled edge of the neighbor's knit cap. */
const KNIT_ROLL = "#3f7f2a";

const LIGHT_SKIN = "#f7cfa8";
const PEACH_SKIN = "#efbb8f";
const TAN_SKIN = "#d99a68";
const MEDIUM_SKIN = "#b97a50";
const BROWN_SKIN = "#9a6440";

/** The cast's looks: bright, warm colors, one main color per person, so each reads at a glance. */
export const LOOKS = {
  grandma: {
    kid: false,
    skin: LIGHT_SKIN,
    hair: "#dcd8e2",
    hairdo: "bun",
    top: tone("#9a5cbc"),
    sleeve: "#9a5cbc",
    trim: "cardigan",
    trimColor: "",
    legs: "long",
    bottom: "#6f3f8c",
    tights: "",
    shoe: "#4a2f22",
    apron: true,
    scarf: null,
    cap: null,
    glasses: true,
    mustache: false,
  },
  dad: {
    kid: false,
    skin: PEACH_SKIN,
    hair: "#94602f",
    hairdo: "short",
    top: tone("#cf5a2a"),
    sleeve: "#cf5a2a",
    trim: "band",
    trimColor: CREAM,
    legs: "trousers",
    bottom: "#5b6f9e",
    tights: "",
    shoe: "#4a2f22",
    apron: false,
    scarf: null,
    cap: null,
    glasses: false,
    mustache: false,
  },
  mom: {
    kid: false,
    skin: MEDIUM_SKIN,
    hair: "#6b3e2c",
    hairdo: "long",
    top: tone("#2f9a84"),
    sleeve: "#2f9a84",
    trim: "plain",
    trimColor: "",
    legs: "trousers",
    bottom: "#6a4a7a",
    tights: "",
    shoe: "#7a4628",
    apron: false,
    scarf: "#ef4f3c",
    cap: null,
    glasses: false,
    mustache: false,
  },
  girl: {
    kid: true,
    skin: TAN_SKIN,
    hair: "#7f4a2e",
    hairdo: "braids",
    top: tone("#e04650"),
    sleeve: CREAM,
    trim: "jumper",
    trimColor: WHITE,
    legs: "knee",
    bottom: "#e04650",
    tights: "#ffcf3f",
    shoe: "#7a3a5a",
    apron: false,
    scarf: null,
    cap: null,
    glasses: false,
    mustache: false,
  },
  boy: {
    kid: true,
    skin: TAN_SKIN,
    hair: "#f0c35a",
    hairdo: "mop",
    top: tone("#3f84de"),
    sleeve: "#3f84de",
    trim: "stripes",
    trimColor: "#ffd94a",
    legs: "trousers",
    bottom: "#3d5590",
    tights: "",
    shoe: "#c8483a",
    apron: false,
    scarf: null,
    cap: null,
    glasses: false,
    mustache: false,
  },
  neighbor: {
    kid: false,
    skin: BROWN_SKIN,
    hair: "#cfcfd6",
    hairdo: "cap",
    top: tone("#f0aa2e"),
    sleeve: "#d24d3e",
    trim: "vest",
    trimColor: "#d24d3e",
    legs: "trousers",
    bottom: "#5f5a6e",
    tights: "",
    shoe: "#4a2f22",
    apron: false,
    scarf: null,
    cap: "#4fa83a",
    glasses: true,
    mustache: true,
  },
} as const satisfies Record<string, Look>;

/** Body measures, local units: feet to hips, hips to shoulders, head radius, shoulder and hip half widths, arm thickness. */
interface Build {
  leg: number;
  torso: number;
  head: number;
  sh: number;
  hip: number;
  arm: number;
  hand: number;
}
const ADULT: Build = { leg: 0.039, torso: 0.034, head: 0.0165, sh: 0.0172, hip: 0.0135, arm: 0.0082, hand: 0.0042 };
const KID: Build = { leg: 0.027, torso: 0.025, head: 0.0148, sh: 0.0126, hip: 0.0102, arm: 0.0068, hand: 0.0036 };

/** How a figure stands this frame. One reused object: set the fields, then call `figure`. */
export interface Pose {
  /** Seen from behind (walking away). */
  back: boolean;
  /** Which way the face turns: -1 left .. 1 right. */
  look: number;
  /** Walk cycle (radians), or NaN standing still. */
  step: number;
  /** 0 standing .. 1 seated on a seat this high. */
  sit: number;
  seat: number;
  /** Arms: hanging, holding a thing in front, raised to (hx, hy), reaching down, a fork to the mouth. */
  arms: "down" | "carry" | "up" | "reach" | "eat";
  /** Hands' target for "up" (relative to the feet). */
  hx: number;
  hy: number;
  /** How far a fork is raised (0 at the plate .. 1 at the mouth), for "eat". */
  eat: number;
  /** What is in the hands. */
  hold: Holding;
  /** The pie in the hands has a slice gone. */
  slice: boolean;
  /** Steam rising off a warm dish (seconds). */
  steam: number;
}

export function newPose(): Pose {
  return {
    back: false,
    look: 0,
    step: NaN,
    sit: 0,
    seat: 0,
    arms: "down",
    hx: 0,
    hy: 0,
    eat: 0,
    hold: { plates: 0, cups: 0, turkey: false, pie: false, pitcher: false },
    slice: false,
    steam: 0,
  };
}

/** Scratch points: the hands. */
const HL = { x: 0, y: 0 };
const HR = { x: 0, y: 0 };

/** Draw a figure with its feet at screen (x, y), 1 local unit = `scale` px. */
export function figure(ctx: Ctx, look: Look, pose: Pose, x: number, y: number, scale: number, lw: number, seed: number): void {
  pen(x, y, scale, seed);
  const b = look.kid ? KID : ADULT;
  const thin = Math.max(1, lw * 0.75);
  const walking = !Number.isNaN(pose.step);
  const swing = walking ? Math.sin(pose.step) : 0;
  const bob = walking ? Math.abs(Math.cos(pose.step)) * 0.0022 : 0;
  // Hips: standing on the legs, or on the seat.
  const hip = b.leg + (pose.seat - b.leg) * pose.sit - bob;
  const lean = pose.arms === "reach" ? 0.004 : 0;
  const shY = hip + b.torso - lean;
  const headY = shY + 0.0035 + b.head;
  hands(pose, look.kid, b, hip, headY);

  // Behind the body: anything carried, when we see the back; long hair and braids, from the front.
  if (pose.back) held(ctx, pose, thin);
  else hairBehind(ctx, look, b.head, headY, thin);

  legs(ctx, look, pose, b, hip, swing, lw);
  body(ctx, look, pose, b, hip, shY, lw, thin);

  // Arms, the thing in the hands, then the hands over its rim, then the head.
  arms(ctx, look, pose, b, hip, shY, lw);
  if (!pose.back) held(ctx, pose, thin);
  ctx.beginPath();
  C(ctx, HL.x, -HL.y, b.hand);
  C(ctx, HR.x, -HR.y, b.hand);
  flat(ctx, look.skin, thin);
  head(ctx, look, pose, b, headY, lw, thin);
}

/** Where the hands are, for the pose. */
function hands(p: Pose, kid: boolean, b: Build, hip: number, headY: number): void {
  switch (p.arms) {
    case "carry":
      // At the waist; a little higher for the kids, just under the chin.
      HL.x = -b.sh * 0.62;
      HR.x = b.sh * 0.62;
      HL.y = HR.y = hip + b.torso * (kid ? 0.45 : 0.42);
      break;
    case "up":
      HL.x = p.hx - 0.004;
      HR.x = p.hx + 0.004;
      HL.y = p.hy;
      HR.y = p.hy + 0.003;
      break;
    case "reach":
      HL.x = -b.sh * 0.55;
      HR.x = b.sh * 0.55;
      HL.y = HR.y = hip - 0.006;
      break;
    case "eat":
      HL.x = -(b.sh + 0.002);
      HL.y = hip + b.torso * 0.25;
      HR.x = b.sh * 0.9 - p.eat * b.sh * 0.6;
      HR.y = hip + b.torso * 0.3 + p.eat * (headY - b.head * 0.6 - hip - b.torso * 0.3);
      break;
    default:
      HL.x = -(b.sh + 0.0035);
      HR.x = b.sh + 0.0035;
      HL.y = HR.y = hip + 0.004;
  }
}

/** One stroke per leg from the ankle to `top` (a height), inked, in `color`, `w` thick. */
function legPair(ctx: Ctx, fx: number, liftL: number, liftR: number, kY: number, top: number, topX: number, w: number, color: string, lw: number): void {
  ctx.beginPath();
  M(ctx, -fx, -0.003 - liftL);
  S(ctx, -fx - 0.0005, -kY);
  S(ctx, -topX, -top);
  M(ctx, fx, -0.003 - liftR);
  S(ctx, fx + 0.0005, -kY);
  S(ctx, topX, -top);
  line(ctx, INK, len(w) + lw * 2);
  line(ctx, color, len(w));
}

function shoes(ctx: Ctx, look: Look, fx: number, liftL: number, liftR: number, lw: number): void {
  ctx.beginPath();
  O(ctx, -fx - 0.001, -0.002 - liftL, 0.0062, 0.0032);
  O(ctx, fx + 0.001, -0.002 - liftR, 0.0062, 0.0032);
  flat(ctx, look.shoe, Math.max(1, lw * 0.7));
}

/** Height of the knee: standing, or bent on the seat. */
function kneeY(b: Build, p: Pose): number {
  const knee = b.leg * 0.48;
  return knee + (p.seat - 0.004 - knee) * p.sit;
}

function legs(ctx: Ctx, look: Look, p: Pose, b: Build, hip: number, swing: number, lw: number): void {
  const lift = 0.0055 * (look.kid ? 0.8 : 1);
  const liftL = Math.max(0, swing) * lift * (1 - p.sit);
  const liftR = Math.max(0, -swing) * lift * (1 - p.sit);
  const fx = b.hip * 0.55;
  if (look.legs === "long") {
    // Shoes peeking out under the hem.
    ctx.beginPath();
    O(ctx, -fx, -0.0022 - liftL, 0.0058, 0.0032);
    O(ctx, fx, -0.0022 - liftR, 0.0058, 0.0032);
    flat(ctx, look.shoe, Math.max(1, lw * 0.7));
    return;
  }
  const kY = kneeY(b, p);
  if (look.legs === "knee") legPair(ctx, fx, liftL, liftR, kY, hip, b.hip * 0.5, b.arm * 0.85, look.tights, lw);
  else legPair(ctx, fx, liftL, liftR, kY, hip, b.hip * 0.5, b.arm * 1.3, look.bottom, lw);
  shoes(ctx, look, fx, liftL, liftR, lw);
}

/** Rounding of the shoulders. */
const SHOULDER_R = 0.005;

/**
 * The torso as the current path, from height `from` up (heights in local units): the sides run
 * straight from the hips out to square, rounded shoulders. The whole torso from its hem; a band
 * across it (the lit shoulders, a stripe) is the same shape cut lower, so nothing needs a clip.
 */
function torsoPath(ctx: Ctx, b: Build, hip: number, top: number, from = hip - 0.002, to = top): void {
  const r = SHOULDER_R;
  const y0 = hip - 0.002;
  const half = (y: number) => b.hip + ((b.sh - b.hip) * (y - y0)) / (top - r - y0);
  ctx.beginPath();
  M(ctx, -half(from), -from);
  if (to < top) {
    S(ctx, -half(to), -to);
    S(ctx, half(to), -to);
  } else {
    S(ctx, -b.sh, -(top - r));
    Q(ctx, -b.sh, -top, -b.sh + r, -top);
    S(ctx, b.sh - r, -top);
    Q(ctx, b.sh, -top, b.sh, -(top - r));
  }
  S(ctx, half(from), -from);
  ctx.closePath();
}

/** Fill a band of the torso between two heights (kept below the shoulders' rounding). */
function slab(ctx: Ctx, b: Build, hip: number, top: number, from: number, to: number, color: string): void {
  torsoPath(ctx, b, hip, top, from, Math.min(to, top - SHOULDER_R));
  ctx.fillStyle = color;
  ctx.fill();
}

function body(ctx: Ctx, look: Look, p: Pose, b: Build, hip: number, shY: number, lw: number, thin: number): void {
  const waist = hip + 0.004;
  if (look.legs === "long" || look.legs === "knee") {
    // A skirt, flaring to the hem: to the ankle, or to the knee (over the lap when seated).
    const hem = look.legs === "long" ? 0.0055 + (look.kid ? 0 : 0.0005) : b.leg * 0.6 + (p.seat - 0.002 - b.leg * 0.6) * p.sit;
    const w = b.hip * (look.legs === "long" ? 1.9 + 0.25 * p.sit : 1.6 + 0.2 * p.sit);
    ctx.beginPath();
    M(ctx, -b.hip, -waist);
    S(ctx, -w, -hem);
    Q(ctx, 0, -hem + 0.003, w, -hem);
    S(ctx, b.hip, -waist);
    ctx.closePath();
    flat(ctx, look.bottom, lw);
    if (look.apron && !p.back) {
      ctx.beginPath();
      M(ctx, -b.hip * 0.75, -waist + 0.001);
      S(ctx, -w * 0.62, -hem - 0.004);
      Q(ctx, 0, -hem - 0.002, w * 0.62, -hem - 0.004);
      S(ctx, b.hip * 0.75, -waist + 0.001);
      ctx.closePath();
      flat(ctx, WHITE, thin);
      // A pocket, and the red rickrack along the hem.
      ctx.beginPath();
      M(ctx, -w * 0.5, -hem - 0.0065);
      Q(ctx, 0, -hem - 0.0045, w * 0.5, -hem - 0.0065);
      line(ctx, TRIM_RED, len(0.0016));
      ctx.beginPath();
      M(ctx, b.hip * 0.05, -(waist - 0.009));
      S(ctx, b.hip * 0.75, -(waist - 0.009));
      S(ctx, b.hip * 0.72, -(waist - 0.018));
      S(ctx, b.hip * 0.08, -(waist - 0.018));
      ctx.closePath();
      flat(ctx, WHITE, thin * 0.8);
    }
  }

  // The torso: lit across the shoulders, shaded at the hem, and what makes it this person's.
  const top = shY;
  const t = look.top;
  torsoPath(ctx, b, hip, top);
  ctx.fillStyle = t.base;
  ctx.fill();
  torsoPath(ctx, b, hip, top, top - b.torso * 0.2);
  ctx.fillStyle = t.light;
  ctx.fill();
  if (look.trim === "stripes") {
    // Stripes all the way round.
    for (let y = hip + 0.006; y < top - 0.006; y += 0.0075) slab(ctx, b, hip, top, y, y + 0.0028, look.trimColor);
  } else if (look.trim === "band") {
    // A knitted band across the chest with a zigzag through it.
    const y1 = top - b.torso * 0.24;
    const h = b.torso * 0.24;
    slab(ctx, b, hip, top, y1 - h, y1, look.trimColor);
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const xx = -b.sh + (2 * b.sh * i) / n;
      const yy = y1 - h * (i % 2 === 0 ? 0.28 : 0.72);
      if (i === 0) M(ctx, xx, -yy);
      else S(ctx, xx, -yy);
    }
    line(ctx, t.base, len(0.0018));
  } else if (look.trim === "vest") {
    // The shirt showing in the vest's V, and the vest's quilting.
    if (!p.back) {
      ctx.beginPath();
      M(ctx, -b.sh * 0.42, -top - 0.001);
      S(ctx, b.sh * 0.42, -top - 0.001);
      S(ctx, 0, -(top - b.torso * 0.5));
      ctx.closePath();
      ctx.fillStyle = look.trimColor;
      ctx.fill();
    }
    ctx.beginPath();
    for (let y = hip + b.torso * 0.25; y < top - 0.006; y += b.torso * 0.24) {
      const half = b.hip + ((b.sh - b.hip) * (y - hip)) / (top - hip) - 0.001;
      M(ctx, -half, -y);
      S(ctx, half, -y);
    }
    line(ctx, t.shade, Math.max(0.8, thin * 0.6));
  }
  // The ribbed hem, then the outline over it all.
  slab(ctx, b, hip, top, hip - 0.002, hip + 0.0045, t.shade);
  torsoPath(ctx, b, hip, top);
  line(ctx, INK, lw);

  if (!p.back) front(ctx, look, b, hip, top, thin);
  else if (look.apron) {
    // Apron strings tied in a bow at the back.
    ctx.beginPath();
    O(ctx, -0.0042, -(hip + 0.006), 0.0042, 0.0026, -0.3);
    O(ctx, 0.0042, -(hip + 0.006), 0.0042, 0.0026, 0.3);
    flat(ctx, WHITE, thin * 0.8);
  }
  if (look.scarf) scarf(ctx, look.scarf, p, b, top, thin);
}

/** The front of the top: buttons, collars, the apron's bib. */
function front(ctx: Ctx, look: Look, b: Build, hip: number, top: number, thin: number): void {
  switch (look.trim) {
    case "cardigan": {
      ctx.beginPath();
      M(ctx, 0, -(top - 0.004));
      S(ctx, 0, -(hip + 0.002));
      line(ctx, look.top.shade, Math.max(0.8, thin * 0.7));
      ctx.beginPath();
      for (let k = 0; k < 3; k++) C(ctx, 0.002, -(hip + 0.009 + k * b.torso * 0.22), 0.0014);
      flat(ctx, CREAM, Math.max(0.6, thin * 0.5));
      break;
    }
    case "band":
    case "stripes":
      // A crew neck.
      ctx.beginPath();
      O(ctx, 0, -(top - 0.0008), b.sh * 0.5, 0.0034);
      flat(ctx, look.top.shade, thin);
      break;
    case "vest":
      // The shirt's collar points and the vest's zip.
      ctx.beginPath();
      M(ctx, -b.sh * 0.42, -top - 0.002);
      S(ctx, -0.001, -(top - 0.006));
      S(ctx, -b.sh * 0.18, -(top - 0.008));
      ctx.closePath();
      M(ctx, b.sh * 0.42, -top - 0.002);
      S(ctx, 0.001, -(top - 0.006));
      S(ctx, b.sh * 0.18, -(top - 0.008));
      ctx.closePath();
      flat(ctx, look.trimColor, thin * 0.8);
      ctx.beginPath();
      M(ctx, 0, -(top - b.torso * 0.5));
      S(ctx, 0, -(hip + 0.004));
      line(ctx, INK, Math.max(0.8, thin * 0.7));
      break;
    case "jumper":
      // A round white collar.
      ctx.beginPath();
      O(ctx, -b.sh * 0.32, -(top - 0.0022), b.sh * 0.36, 0.0036, 0.25);
      O(ctx, b.sh * 0.32, -(top - 0.0022), b.sh * 0.36, 0.0036, -0.25);
      flat(ctx, look.trimColor, thin * 0.8);
      break;
    default:
  }
  if (look.apron) {
    // The apron's bib, its strap round the neck and the rickrack along its top.
    const y1 = top - 0.009;
    ctx.beginPath();
    M(ctx, -b.sh * 0.42, -y1);
    S(ctx, -0.003, -top - 0.001);
    M(ctx, b.sh * 0.42, -y1);
    S(ctx, 0.003, -top - 0.001);
    line(ctx, INK, len(0.0018) + thin * 2);
    line(ctx, WHITE, len(0.0018));
    ctx.beginPath();
    M(ctx, -b.sh * 0.5, -y1);
    S(ctx, b.sh * 0.5, -y1);
    S(ctx, b.hip * 0.78, -(hip + 0.003));
    S(ctx, -b.hip * 0.78, -(hip + 0.003));
    ctx.closePath();
    flat(ctx, WHITE, thin);
    ctx.beginPath();
    M(ctx, -b.sh * 0.42, -(y1 - 0.0028));
    S(ctx, b.sh * 0.42, -(y1 - 0.0028));
    line(ctx, TRIM_RED, len(0.0016));
  }
}

/** Mom's scarf: wound round the neck, the two striped ends hanging down the front with a fringe. */
function scarf(ctx: Ctx, color: string, p: Pose, b: Build, top: number, thin: number): void {
  if (!p.back) {
    scarfEnd(ctx, color, -b.sh * 0.28, top - 0.002, b.torso * 0.78, -0.0018, thin);
    scarfEnd(ctx, color, b.sh * 0.1, top - 0.002, b.torso * 0.5, 0.0012, thin);
  }
  ctx.beginPath();
  O(ctx, 0, -(top + 0.0012), b.sh * 0.74, 0.0052);
  flat(ctx, color, thin);
}

const SCARF_W = 0.0076;

function scarfEnd(ctx: Ctx, color: string, x: number, y: number, length: number, tilt: number, thin: number): void {
  const h = SCARF_W / 2;
  const yb = y - length;
  ctx.beginPath();
  M(ctx, x - h, -y);
  S(ctx, x + h, -y);
  S(ctx, x + h + tilt, -yb);
  S(ctx, x - h + tilt, -yb);
  ctx.closePath();
  flat(ctx, color, thin);
  // A yellow stripe near the end, and the fringe.
  const yy = yb + 0.0055;
  ctx.beginPath();
  M(ctx, x - h + tilt * 0.9, -yy);
  S(ctx, x + h + tilt * 0.9, -yy);
  line(ctx, SCARF_STRIPE, len(0.0022));
  ctx.beginPath();
  for (const d of [-0.0024, 0, 0.0024]) {
    M(ctx, x + tilt + d, -(yb - 0.0008));
    S(ctx, x + tilt + d * 1.15, -(yb - 0.003));
  }
  line(ctx, color, Math.max(0.9, thin * 0.7));
}

function arms(ctx: Ctx, look: Look, p: Pose, b: Build, hip: number, shY: number, lw: number): void {
  const sx = b.sh - 0.003;
  const sy = shY - 0.004;
  // Elbows bend out a little from straight: down at the sides, or out and up when raised.
  const ex = b.sh + (p.arms === "up" ? 0.01 : 0.006);
  const ey = p.arms === "up" ? sy + 0.012 : hip + b.torso * 0.32;
  ctx.beginPath();
  M(ctx, -sx, -sy);
  Q(ctx, -ex, -ey, HL.x, -HL.y);
  M(ctx, sx, -sy);
  Q(ctx, ex, -ey, HR.x, -HR.y);
  line(ctx, INK, len(b.arm) + lw * 2);
  line(ctx, look.sleeve, len(b.arm));
}

/** What the hands hold, at the hands. */
function held(ctx: Ctx, p: Pose, thin: number): void {
  const h = p.hold;
  const cx = (HL.x + HR.x) / 2;
  const cy = -Math.max(HL.y, HR.y) + 0.002;
  if (h.turkey) turkeyPlatter(ctx, cx, cy + 0.004, thin, p.steam);
  else if (h.pie) pie(ctx, cx, cy + 0.003, thin, p.slice, p.steam);
  else if (h.plates > 0) dishStack(ctx, cx, cy + 0.003, h.plates, h.cups, thin);
  else if (h.cups > 0 || h.pitcher) cupTray(ctx, cx, cy + 0.003, h.cups, h.pitcher, thin);
}

/** Hair that hangs behind a face seen from the front: Mom's long hair, the girl's braids, Grandma's bun. */
function hairBehind(ctx: Ctx, look: Look, r: number, headY: number, thin: number): void {
  if (look.hairdo === "long") {
    ctx.beginPath();
    M(ctx, -r * 1.05, -(headY + r * 0.2));
    Q(ctx, -r * 1.35, -(headY - r * 1.0), -r * 1.18, -(headY - r * 1.75));
    Q(ctx, 0, -(headY - r * 1.95), r * 1.18, -(headY - r * 1.75));
    Q(ctx, r * 1.35, -(headY - r * 1.0), r * 1.05, -(headY + r * 0.2));
    Q(ctx, 0, -(headY + r * 1.5), -r * 1.05, -(headY + r * 0.2));
    ctx.closePath();
    flat(ctx, look.hair, thin);
  } else if (look.hairdo === "braids") braids(ctx, look, r, headY, thin, false);
  else if (look.hairdo === "bun") bun(ctx, look, r, headY, thin);
}

function bun(ctx: Ctx, look: Look, r: number, headY: number, thin: number): void {
  ctx.beginPath();
  C(ctx, 0, -(headY + r * 0.98), r * 0.42);
  flat(ctx, look.hair, thin);
}

/** The girl's braids, with green bobbles: at the sides of her face, or (`back`) down her back. */
function braids(ctx: Ctx, look: Look, r: number, headY: number, thin: number, back: boolean): void {
  const x0 = r * (back ? 0.42 : 0.85);
  const xm = r * (back ? 0.62 : 1.1);
  const x1 = r * (back ? 0.5 : 0.9);
  const y0 = headY - r * (back ? 0.55 : 0.2);
  ctx.beginPath();
  M(ctx, -x0, -y0);
  Q(ctx, -xm, -(headY - r * 1.2), -x1, -(headY - r * 1.9));
  M(ctx, x0, -y0);
  Q(ctx, xm, -(headY - r * 1.2), x1, -(headY - r * 1.9));
  line(ctx, INK, len(0.0055) + thin * 2);
  line(ctx, look.hair, len(0.0055));
  ctx.beginPath();
  C(ctx, -x1, -(headY - r * 1.95), 0.0022);
  C(ctx, x1, -(headY - r * 1.95), 0.0022);
  flat(ctx, BOBBLE, thin * 0.8);
}

function head(ctx: Ctx, look: Look, p: Pose, b: Build, headY: number, lw: number, thin: number): void {
  const r = b.head;
  const fx = p.back ? 0 : p.look * r * 0.28;
  if (p.back) {
    backOfHead(ctx, look, r, headY, lw, thin);
    if (look.cap) knitCap(ctx, look, r, headY, thin);
    return;
  }
  // The face.
  ctx.beginPath();
  C(ctx, 0, -headY, r);
  flat(ctx, look.skin, lw);
  hairFront(ctx, look, r, headY, fx, thin);
  if (look.cap) knitCap(ctx, look, r, headY, thin);

  // Face: dot eyes, rosy cheeks, a smile; spectacles and a mustache for some.
  const ey = headY + r * 0.02;
  ctx.beginPath();
  C(ctx, fx - r * 0.36, -ey, r * 0.12);
  C(ctx, fx + r * 0.36, -ey, r * 0.12);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  C(ctx, fx - r * 0.56, -(headY - r * 0.32), r * 0.17);
  C(ctx, fx + r * 0.56, -(headY - r * 0.32), r * 0.17);
  ctx.fillStyle = CHEEK;
  ctx.fill();
  ctx.beginPath();
  M(ctx, fx - r * 0.24, -(headY - r * 0.36));
  Q(ctx, fx, -(headY - r * 0.62), fx + r * 0.24, -(headY - r * 0.36));
  line(ctx, INK, thin * 0.9);
  if (look.mustache) {
    ctx.beginPath();
    O(ctx, fx - r * 0.17, -(headY - r * 0.3), r * 0.22, r * 0.1, -0.25);
    O(ctx, fx + r * 0.17, -(headY - r * 0.3), r * 0.22, r * 0.1, 0.25);
    flat(ctx, look.hair, thin * 0.7);
  }
  if (look.glasses) {
    ctx.beginPath();
    C(ctx, fx - r * 0.36, -ey, r * 0.27);
    C(ctx, fx + r * 0.36, -ey, r * 0.27);
    M(ctx, fx - r * 0.09, -ey);
    S(ctx, fx + r * 0.09, -ey);
    line(ctx, INK, thin * 0.85);
  }
}

/** The hair over the top of a face seen from the front, framing it. */
function hairFront(ctx: Ctx, look: Look, r: number, headY: number, fx: number, thin: number): void {
  ctx.beginPath();
  switch (look.hairdo) {
    case "cap":
      // Just the sides show under the cap.
      O(ctx, -r * 0.95, -(headY + r * 0.05), r * 0.2, r * 0.36);
      O(ctx, r * 0.95, -(headY + r * 0.05), r * 0.2, r * 0.36);
      break;
    case "mop":
      // A mop with a ragged fringe.
      M(ctx, -r * 1.04, -(headY - r * 0.05));
      Q(ctx, -r * 1.2, -(headY + r * 1.25), 0, -(headY + r * 1.12));
      Q(ctx, r * 1.2, -(headY + r * 1.25), r * 1.04, -(headY - r * 0.05));
      Q(ctx, r * 0.7, -(headY + r * 0.25), fx + r * 0.4, -(headY + r * 0.42));
      Q(ctx, fx + r * 0.15, -(headY + r * 0.3), fx, -(headY + r * 0.5));
      Q(ctx, fx - r * 0.3, -(headY + r * 0.3), fx - r * 0.5, -(headY + r * 0.45));
      Q(ctx, -r * 0.75, -(headY + r * 0.25), -r * 1.04, -(headY - r * 0.05));
      ctx.closePath();
      break;
    case "long":
      // Down both sides of the face, a fringe swept to one side.
      M(ctx, -r * 1.04, -(headY - r * 0.35));
      Q(ctx, -r * 1.22, -(headY + r * 1.3), 0, -(headY + r * 1.14));
      Q(ctx, r * 1.22, -(headY + r * 1.3), r * 1.04, -(headY - r * 0.35));
      Q(ctx, r * 0.8, -(headY + r * 0.1), fx + r * 0.42, -(headY + r * 0.55));
      Q(ctx, fx - r * 0.15, -(headY + r * 0.42), fx - r * 0.62, -(headY + r * 0.3));
      Q(ctx, -r * 0.9, -(headY + r * 0.05), -r * 1.04, -(headY - r * 0.35));
      ctx.closePath();
      break;
    case "braids":
      // Parted in the middle, a short fringe.
      M(ctx, -r * 1.04, -(headY - r * 0.12));
      Q(ctx, -r * 1.2, -(headY + r * 1.28), 0, -(headY + r * 1.14));
      Q(ctx, r * 1.2, -(headY + r * 1.28), r * 1.04, -(headY - r * 0.12));
      Q(ctx, r * 0.78, -(headY + r * 0.4), fx + r * 0.1, -(headY + r * 0.5));
      Q(ctx, fx - r * 0.1, -(headY + r * 0.62), fx - r * 0.1, -(headY + r * 0.5));
      Q(ctx, -r * 0.78, -(headY + r * 0.4), -r * 1.04, -(headY - r * 0.12));
      ctx.closePath();
      break;
    case "bun":
      // Soft waves back from the face to the bun on top.
      M(ctx, -r * 1.03, -(headY - r * 0.05));
      Q(ctx, -r * 1.18, -(headY + r * 1.24), 0, -(headY + r * 1.12));
      Q(ctx, r * 1.18, -(headY + r * 1.24), r * 1.03, -(headY - r * 0.05));
      Q(ctx, r * 0.9, -(headY + r * 0.45), fx + r * 0.35, -(headY + r * 0.58));
      Q(ctx, fx, -(headY + r * 0.48), fx - r * 0.35, -(headY + r * 0.58));
      Q(ctx, -r * 0.9, -(headY + r * 0.45), -r * 1.03, -(headY - r * 0.05));
      ctx.closePath();
      break;
    default:
      // Short, with a side part and a little cowlick.
      M(ctx, -r * 1.02, -(headY + r * 0.05));
      Q(ctx, -r * 1.16, -(headY + r * 1.22), 0, -(headY + r * 1.12));
      Q(ctx, r * 1.16, -(headY + r * 1.22), r * 1.02, -(headY + r * 0.05));
      Q(ctx, r * 0.85, -(headY + r * 0.5), fx + r * 0.3, -(headY + r * 0.62));
      Q(ctx, fx - r * 0.3, -(headY + r * 0.72), fx - r * 0.55, -(headY + r * 0.5));
      Q(ctx, -r * 0.9, -(headY + r * 0.42), -r * 1.02, -(headY + r * 0.05));
      ctx.closePath();
      M(ctx, r * 0.05, -(headY + r * 1.1));
      Q(ctx, r * 0.15, -(headY + r * 1.45), r * 0.42, -(headY + r * 1.36));
      Q(ctx, r * 0.25, -(headY + r * 1.3), r * 0.3, -(headY + r * 1.06));
      ctx.closePath();
  }
  flat(ctx, look.hair, thin);
}

/** A darker shade of each hair color, for the strands drawn on the back of a head (made once each). */
const STRANDS = new Map<string, string>();

function strandColor(hair: string): string {
  let c = STRANDS.get(hair);
  if (!c) {
    c = mix(hair, INK, 0.32);
    STRANDS.set(hair, c);
  }
  return c;
}

/**
 * The head seen from behind: the back of the hair, combed down from the crown in a few darker
 * strands, with the ears peeking out at the sides where the hair is short (Dad, the boy's mop,
 * the neighbor under his cap), so nobody walking away up the path looks like a blank face.
 */
function backOfHead(ctx: Ctx, look: Look, r: number, headY: number, lw: number, thin: number): void {
  const covered = look.hairdo === "long" || look.hairdo === "braids" || look.hairdo === "bun";
  if (!covered) {
    ctx.beginPath();
    O(ctx, -r * 1.0, -(headY - r * 0.12), r * 0.24, r * 0.3);
    O(ctx, r * 1.0, -(headY - r * 0.12), r * 0.24, r * 0.3);
    flat(ctx, look.skin, thin);
  }
  ctx.beginPath();
  C(ctx, 0, -headY, r);
  flat(ctx, look.hair, lw);
  hairFromBehind(ctx, look, r, headY, thin);
  if (look.hairdo === "long" || look.hairdo === "bun") return;
  // Strands from the crown (under a cap, only the ends of them, at the nape).
  const cy = headY + r * (look.cap ? 0.2 : 0.55);
  ctx.beginPath();
  for (const k of BACK_STRANDS) {
    M(ctx, k * r * 0.12, -cy);
    Q(ctx, k * r * 0.62, -(cy - r * 0.5), k * r * 0.7, -(headY - r * (0.78 - Math.abs(k) * 0.18)));
  }
  if (look.hairdo === "braids") {
    // Her part, down to where the braids begin.
    M(ctx, 0, -(headY + r * 0.95));
    S(ctx, 0, -(headY - r * 0.5));
  }
  line(ctx, strandColor(look.hair), Math.max(0.8, thin * 0.75));
}

/** Where the strands on the back of a head end up, as fractions of its radius either side of the middle. */
const BACK_STRANDS = [-1, -0.45, 0.1, 0.62] as const;

/** Hair that covers the whole back of the head: long hair down to the shoulders, braids down the back, the bun on top. */
function hairFromBehind(ctx: Ctx, look: Look, r: number, headY: number, thin: number): void {
  if (look.hairdo === "long") {
    ctx.beginPath();
    M(ctx, -r * 1.02, -(headY + r * 0.2));
    Q(ctx, -r * 1.28, -(headY - r * 1.0), -r * 1.1, -(headY - r * 1.7));
    Q(ctx, 0, -(headY - r * 1.9), r * 1.1, -(headY - r * 1.7));
    Q(ctx, r * 1.28, -(headY - r * 1.0), r * 1.02, -(headY + r * 0.2));
    Q(ctx, 0, -(headY + r * 1.45), -r * 1.02, -(headY + r * 0.2));
    ctx.closePath();
    flat(ctx, look.hair, thin);
  } else if (look.hairdo === "braids") braids(ctx, look, r, headY, thin, true);
  else if (look.hairdo === "bun") bun(ctx, look, r, headY, thin);
}

/** The neighbor's snug green knit cap, rolled at the edge. */
function knitCap(ctx: Ctx, look: Look, r: number, headY: number, thin: number): void {
  ctx.beginPath();
  M(ctx, -r * 1.04, -(headY + r * 0.36));
  Q(ctx, -r * 1.08, -(headY + r * 1.3), 0, -(headY + r * 1.24));
  Q(ctx, r * 1.08, -(headY + r * 1.3), r * 1.04, -(headY + r * 0.36));
  ctx.closePath();
  flat(ctx, look.cap ?? look.hair, thin);
  ctx.beginPath();
  M(ctx, -r * 1.06, -(headY + r * 0.4));
  Q(ctx, 0, -(headY + r * 0.6), r * 1.06, -(headY + r * 0.4));
  line(ctx, INK, len(r * 0.34) + thin * 2);
  line(ctx, KNIT_ROLL, len(r * 0.34));
}
