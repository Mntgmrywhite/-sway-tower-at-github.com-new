import { type Ctx } from "../../base/draw";
import { INK, PUMPKIN, STEM, tone, WOOD, WOOD_DARK } from "./colors";
import { cel, flat, L, len, line, M, O, pen, Q, R, RS, S, X, Y } from "./pen";

// Thanksgiving dinner set out in the backyard: a table under a checked cloth, a lattice pie in
// the middle, a little pumpkin, a jug of cider and plates, and chairs that don't match: a
// ladder-back and a red spindle chair behind, a blue kitchen chair at one end and a green
// rocking chair brought out from the porch at the other. Local units (u at the tower's depth), origin on the ground
// between the front legs.

const CLOTH = tone("#fff4dc", 0.4, 0.14);
const CHECK = "rgba(226, 92, 58, 0.34)";
const RED_CHAIR = tone("#d8483a");
const BLUE_CHAIR = tone("#5f8fd6");
const ROCKER = tone("#6fae55");
const DISH = tone("#b9c6d8", 0.4, 0.2);
const CRUST = tone("#f0b552", 0.35, 0.22);
const CIDER = tone("#e8962e", 0.35, 0.2);
const PLATE = "#ffffff";

const TH = 0.066; // table top height (front edge)
const HW = 0.088; // half width
const DEPTH = 0.022; // how much of the top we see
const HEM = 0.034; // cloth drop below the top edge
const SCALLOPS = 7;

const CHECKS_X = [-0.075, -0.045, -0.015, 0.015, 0.045, 0.075] as const;
const SLATS = [-0.126, -0.109] as const;
const SPINDLES = [-0.0115, 0.0115] as const;
const LATTICE = [-0.012, 0, 0.012] as const;

/** The ladder-back chair behind the table, left of center. */
function ladderBack(ctx: Ctx, lw: number): void {
  const x = -0.042;
  ctx.beginPath();
  R(ctx, x - 0.024, -0.132, 0.008, 0.12);
  R(ctx, x + 0.016, -0.132, 0.008, 0.12);
  cel(ctx, WOOD_DARK, -0.132, -0.012, lw, 0.2, 0.2);
  ctx.beginPath();
  for (const yy of SLATS) R(ctx, x - 0.018, yy, 0.036, 0.009);
  cel(ctx, WOOD, -0.126, -0.1, lw, 0.3, 0.2);
}

/** The red spindle chair behind the table, right of center: an arched top rail. */
function spindle(ctx: Ctx, lw: number): void {
  const x = 0.046;
  ctx.beginPath();
  for (const sx of SPINDLES) {
    M(ctx, x + sx, -0.116);
    S(ctx, x + sx, -0.09);
  }
  line(ctx, INK, len(0.005) + lw * 2);
  line(ctx, RED_CHAIR.base, len(0.005));
  ctx.beginPath();
  R(ctx, x - 0.031, -0.118, 0.009, 0.106);
  R(ctx, x + 0.022, -0.118, 0.009, 0.106);
  cel(ctx, RED_CHAIR, -0.118, -0.012, lw, 0.2, 0.2);
  ctx.beginPath();
  M(ctx, x - 0.035, -0.112);
  Q(ctx, x, -0.142, x + 0.035, -0.112);
  L(ctx, x + 0.035, -0.102);
  Q(ctx, x, -0.13, x - 0.035, -0.102);
  ctx.closePath();
  cel(ctx, RED_CHAIR, -0.13, -0.102, lw, 0.3, 0.2);
}

/** Blue kitchen chair at the left end, facing the table: side view, back away from it. */
function kitchenChair(ctx: Ctx, lw: number): void {
  const x = -HW - 0.027;
  ctx.beginPath();
  // Back legs/post, front leg
  R(ctx, x - 0.022, -0.118, 0.008, 0.118);
  R(ctx, x + 0.016, -0.046, 0.007, 0.046);
  cel(ctx, BLUE_CHAIR, -0.118, 0, lw, 0.2, 0.2);
  ctx.beginPath();
  R(ctx, x - 0.024, -0.05, 0.05, 0.01);
  cel(ctx, BLUE_CHAIR, -0.05, -0.04, lw, 0.4, 0.2);
  ctx.beginPath();
  R(ctx, x - 0.026, -0.112, 0.012, 0.05);
  flat(ctx, BLUE_CHAIR.light, lw);
  ctx.beginPath();
  M(ctx, x - 0.016, -0.02);
  L(ctx, x + 0.018, -0.02);
  line(ctx, INK, lw * 1.2);
}

/** Green rocking chair at the right end, facing the table: side view, on its rockers. */
function rocker(ctx: Ctx, lw: number): void {
  const x = HW + 0.03;
  const wood = ROCKER;
  // Rocker, legs and the back post
  ctx.beginPath();
  M(ctx, x - 0.034, -0.012);
  Q(ctx, x - 0.004, 0.008, x + 0.036, -0.008);
  M(ctx, x - 0.018, -0.002);
  L(ctx, x - 0.018, -0.05);
  M(ctx, x + 0.018, 0.001);
  L(ctx, x + 0.022, -0.05);
  L(ctx, x + 0.032, -0.122);
  M(ctx, x - 0.02, -0.05);
  L(ctx, x - 0.02, -0.076);
  line(ctx, INK, len(0.008) + lw * 2);
  line(ctx, wood.base, len(0.008));
  // Back slat panel, reclined
  ctx.beginPath();
  M(ctx, x + 0.018, -0.06);
  L(ctx, x + 0.025, -0.116);
  L(ctx, x + 0.035, -0.114);
  L(ctx, x + 0.028, -0.058);
  ctx.closePath();
  cel(ctx, wood, -0.116, -0.058, lw, 0.3, 0.2);
  // Seat and armrest
  ctx.beginPath();
  R(ctx, x - 0.026, -0.056, 0.052, 0.009);
  R(ctx, x - 0.028, -0.081, 0.05, 0.007);
  cel(ctx, wood, -0.081, -0.047, lw, 0.35, 0.2);
}

const STEAM = "rgba(255, 255, 255, 0.85)";
/** Wisps of steam off the warm pie: x offset, phase. */
const WISPS = [
  [-0.008, 0],
  [0.012, 0.45],
] as const;
const STEAM_T = 2.6;

/** Steam curling up off the pie, each wisp rising and fading in turn. */
function steam(ctx: Ctx, t: number, lw: number): void {
  const top = -TH - DEPTH * 0.5 - 0.012;
  ctx.lineCap = "round";
  ctx.strokeStyle = STEAM;
  ctx.lineWidth = Math.max(1.2, lw * 0.9);
  for (const [wx, ph] of WISPS) {
    const k = (t / STEAM_T + ph) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    const y0 = top - k * 0.012;
    ctx.beginPath();
    M(ctx, 0.008 + wx, y0);
    Q(ctx, 0.008 + wx - 0.008, y0 - 0.008, 0.008 + wx, y0 - 0.016);
    Q(ctx, 0.008 + wx + 0.008, y0 - 0.024, 0.008 + wx, y0 - 0.032);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Food: a lattice pie, a pumpkin, a jug of cider and two plates. */
function dinner(ctx: Ctx, lw: number): void {
  const thin = Math.max(1, lw * 0.75);
  const top = -TH - DEPTH * 0.5;
  // Plates
  ctx.beginPath();
  O(ctx, -0.07, top + 0.005, 0.012, 0.004);
  O(ctx, 0.074, top + 0.005, 0.012, 0.004);
  flat(ctx, PLATE, thin);
  // Pumpkin centerpiece
  ctx.beginPath();
  O(ctx, -0.04, top - 0.004, 0.015, 0.011);
  cel(ctx, PUMPKIN, top - 0.015, top + 0.007, thin, 0.25, 0.3);
  ctx.beginPath();
  M(ctx, -0.04, top - 0.014);
  S(ctx, -0.038, top - 0.022);
  line(ctx, STEM, len(0.005));
  // Pie in its dish, lattice on top
  ctx.beginPath();
  O(ctx, 0.008, top + 0.002, 0.031, 0.011);
  cel(ctx, DISH, top - 0.009, top + 0.013, thin, 0.3, 0.3);
  ctx.beginPath();
  O(ctx, 0.008, top - 0.002, 0.026, 0.008);
  cel(ctx, CRUST, top - 0.01, top + 0.006, thin, 0.3, 0.25);
  ctx.beginPath();
  for (const d of LATTICE) {
    M(ctx, 0.008 + d - 0.006, top - 0.008);
    S(ctx, 0.008 + d + 0.006, top + 0.004);
    M(ctx, 0.008 + d + 0.006, top - 0.008);
    S(ctx, 0.008 + d - 0.006, top + 0.004);
  }
  line(ctx, CRUST.shade, thin);
  // Jug of cider with a handle
  ctx.beginPath();
  M(ctx, 0.044, top + 0.004);
  Q(ctx, 0.04, top - 0.02, 0.047, top - 0.034);
  L(ctx, 0.044, top - 0.04);
  L(ctx, 0.062, top - 0.038);
  Q(ctx, 0.068, top - 0.02, 0.063, top + 0.004);
  ctx.closePath();
  cel(ctx, CIDER, top - 0.04, top + 0.004, thin, 0.25, 0.3);
  ctx.beginPath();
  M(ctx, 0.063, top - 0.03);
  Q(ctx, 0.076, top - 0.026, 0.065, top - 0.01);
  line(ctx, INK, len(0.004) + thin * 2);
  line(ctx, CIDER.base, len(0.004));
}

export function table(ctx: Ctx, t: number, x: number, y: number, scale: number, lw: number): void {
  pen(x, y, scale, 23);
  // Behind the table: back legs and the two chairs whose backs show over it.
  ladderBack(ctx, lw);
  spindle(ctx, lw);
  ctx.beginPath();
  RS(ctx, -HW + 0.008, -TH, 0.008, TH - 0.014);
  RS(ctx, HW - 0.016, -TH, 0.008, TH - 0.014);
  cel(ctx, WOOD_DARK, -TH, -0.014, lw, 0.1, 0.3);

  // Front legs below the cloth
  ctx.beginPath();
  R(ctx, -HW + 0.002, -TH + HEM - 0.004, 0.01, TH - HEM + 0.004);
  R(ctx, HW - 0.012, -TH + HEM - 0.004, 0.01, TH - HEM + 0.004);
  cel(ctx, WOOD, -TH + HEM, 0, lw, 0.1, 0.3);

  // The cloth: the top we look down on, then the checked drop with a scalloped hem.
  ctx.beginPath();
  M(ctx, -HW - 0.012, -TH);
  L(ctx, -HW + 0.002, -TH - DEPTH);
  L(ctx, HW - 0.002, -TH - DEPTH);
  L(ctx, HW + 0.012, -TH);
  ctx.closePath();
  flat(ctx, CLOTH.light, lw);
  ctx.beginPath();
  M(ctx, -HW - 0.012, -TH);
  L(ctx, HW + 0.012, -TH);
  L(ctx, HW + 0.014, -TH + HEM);
  const w = (2 * HW + 0.028) / SCALLOPS;
  for (let i = 0; i < SCALLOPS; i++) {
    const x1 = HW + 0.014 - w * (i + 1);
    Q(ctx, x1 + w / 2, -TH + HEM + 0.012, x1, -TH + HEM);
  }
  ctx.closePath();
  ctx.fillStyle = CLOTH.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CHECK;
  for (const cx of CHECKS_X) ctx.fillRect(X(cx - 0.0075), Y(-TH - 0.01), len(0.015), len(HEM + 0.03));
  ctx.fillRect(X(-HW - 0.03), Y(-TH + 0.008), len(2 * HW + 0.06), len(0.012));
  ctx.fillRect(X(-HW - 0.03), Y(-TH + 0.028), len(2 * HW + 0.06), len(0.012));
  ctx.fillStyle = CLOTH.shade;
  ctx.fillRect(X(-HW - 0.03), Y(-TH + HEM - 0.008), len(2 * HW + 0.06), len(0.03));
  ctx.restore();
  ink(ctx, lw);

  dinner(ctx, lw);
  steam(ctx, t, lw);
  kitchenChair(ctx, lw);
  rocker(ctx, lw);
}

function ink(ctx: Ctx, lw: number): void {
  line(ctx, INK, lw);
}
