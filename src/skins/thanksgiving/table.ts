import { circle, hash, type Ctx } from "../../base/draw";
import type { Scene } from "../skin";
import { INK, tone, WOOD, WOOD_DARK } from "./colors";
import { cups, pie, pitcher, plates, turkeyPlatter } from "./dishes";
import { figure, LOOKS, newPose, type Pose } from "./folk";
import { DOOR, openDoor } from "./house";
import { cel, flat, inkW, L, len, line, M, pen, Q, R, RS, S, X, Y } from "./pen";
import {
  CAST,
  CUP_X,
  cycleTime,
  DEPTH,
  doing,
  HEM,
  holding,
  HW,
  KIDS,
  LX_IN,
  LY_ADULT,
  LY_END,
  LY_KID,
  OVER,
  PIE_X,
  PITCHER_X,
  PLACE_DEPTH,
  PLACES,
  SEATS,
  smooth,
  STAY,
  T,
  tableInto,
  TH,
  TURKEY_X,
  type Doing,
  type Table,
  type Who,
} from "./supper";

// Thanksgiving supper out in the backyard: a table with seats that don't match (an apple crate,
// a red spindle chair and a bench for the kids behind, a blue kitchen chair at the left end and
// Grandma's green rocking chair brought out from the porch at the right), and the
// family of the hollow setting it, eating and clearing it on a 40-second round (supper.ts): the
// cloth billows down, the plates and cups go round, the turkey and a pie come down the garden
// path from the porch door, everyone sits; later it all goes back up the path, the cloth is
// shaken out, and round again. Local units (u at the tower's depth), origin on the ground
// between the table's front legs.

const CLOTH = tone("#fff4dc", 0.4, 0.14);
const CHECK = "rgba(226, 92, 58, 0.34)";
const RED_CHAIR = tone("#d8483a");
const BLUE_CHAIR = tone("#5f8fd6");
const ROCKER = tone("#6fae55");
const BENCH = tone("#c99a5c");
const CRATE = tone("#d9a45a");
const CRUMB = "#b77c3c";
const SCALLOPS = 7;

/** Back-row chairs stand this far behind the front legs (local y of their feet). */
const BACK = -0.012;
/** Seat heights: the grown-ups' chairs, and the kids' bench (a little higher, so they see over the table). */
const SEAT = 0.03;
const BENCH_SEAT = 0.034;
/** Raised cloth: where its corners hang when held up, how far it hangs below them. */
const HOLD_Y = -0.106;
const HANG = 0.048;

/** On the garden path: a share of the route spent coming down the porch steps. */
const STEPS = 0.07;
/** Steps taken down the whole path, and along behind the table per local unit. */
const LANE_STEPS = 9;
const STRIDE = 0.034;
/** A grown-up's height in the house's own units, so they fit the porch door. */
const DOOR_HEIGHT = 0.05;
const ADULT_HEIGHT = 0.11;
/** The finest ink line (css px) on a figure coming down the path. */
const WALKER_INK = 0.6;

/** A spot for a prop: screen x, y of its origin and its perspective scale. */
export interface Spot {
  x: number;
  y: number;
  k: number;
}

const POSE: Pose = newPose();
const TABLE: Table = {
  cloth: 0,
  shake: 0,
  plate: [false, false, false, false, false, false],
  cup: [false, false, false, false, false, false],
  food: [0, 0, 0, 0, 0, 0],
  turkey: false,
  pitcher: false,
  pie: false,
  slice: false,
};

/** The two seats at the ends, drawn in front of the table: the people sitting in them. */
const FRONT: Who[] = [];
const BEHIND: Who[] = [];
const LANE: Who[] = [];
const NOW: Record<Who, Doing> = {} as Record<Who, Doing>;
/** Where each person at the table is this frame: local x, y of the feet. */
const AT: Record<Who, { x: number; y: number }> = {
  grandma: { x: 0, y: 0 },
  dad: { x: 0, y: 0 },
  mom: { x: 0, y: 0 },
  girl: { x: 0, y: 0 },
  boy: { x: 0, y: 0 },
  neighbor: { x: 0, y: 0 },
};
const SEED: Record<Who, number> = { grandma: 61, dad: 67, mom: 71, girl: 73, boy: 79, neighbor: 83 };
/** Each diner's own rhythm at the table: chatting glances and forkfuls. */
const PHASE: Record<Who, number> = { grandma: 0.1, dad: 0.55, mom: 0.3, girl: 0.8, boy: 0.15, neighbor: 0.65 };

/**
 * The supper: the table at `tbl`, the family coming and going from the house's door at `house`.
 * With `only`, just that one person where they are this frame (nothing else: for the tests).
 */
export function supper(ctx: Ctx, s: Scene, tbl: Spot, house: Spot, only?: Who): void {
  const tau = cycleTime(s.t);
  const table = tableInto(TABLE, tau);
  const ts = s.u * tbl.k;
  const lw = inkW(s, tbl.k);
  const thin = Math.max(1, lw * 0.75);

  LANE.length = 0;
  BEHIND.length = 0;
  FRONT.length = 0;
  let doorOpen = false;
  for (const who of CAST) {
    const d = doing(who, tau);
    NOW[who] = d;
    if (d.act === "in") {
      if (d.age < 0.25 || d.span - d.age < 0.3) doorOpen = true;
      continue;
    }
    if (d.r < 1 && !STAY.has(who)) {
      LANE.push(who);
      if (d.r < 0.14) doorOpen = true;
      continue;
    }
    place(who, d);
    (AT[who].y > -0.009 ? FRONT : BEHIND).push(who);
  }

  const hs = s.u * house.k;
  if (only) {
    alone(ctx, s, only, tau, table, tbl, ts, lw, house, hs);
    return;
  }

  // The door open while someone comes or goes; the back chairs and the bench; the people on
  // the garden path, farthest first, and behind the table (in front of the chairs, so no one
  // is ever cut by a chair back); then the table.
  if (doorOpen) openDoor(ctx, house.x, house.y, hs, inkW(s, house.k));
  pen(tbl.x, tbl.y, ts, 23);
  crate(ctx, lw);
  spindle(ctx, lw);
  bench(ctx, lw);
  LANE.sort((a, b) => NOW[a].r - NOW[b].r);
  for (const who of LANE) walker(ctx, s, who, NOW[who], tau, tbl, ts, house, hs);
  pen(tbl.x, tbl.y, ts, 23);
  BEHIND.sort((a, b) => AT[a].y - AT[b].y);
  for (const who of BEHIND) person(ctx, who, NOW[who], tau, table, tbl, ts, lw);

  pen(tbl.x, tbl.y, ts, 23);
  legs(ctx, lw);
  if (table.cloth >= 1) {
    restingCloth(ctx, lw);
    dinner(ctx, table, tau, thin);
  } else {
    bareTop(ctx, lw);
    raisedCloth(ctx, table, tau, lw);
  }

  // The ends: Dad's kitchen chair and Grandma's rocker, with them in it (or standing behind).
  kitchenChair(ctx, lw);
  for (const who of FRONT) if (who !== "grandma") person(ctx, who, NOW[who], tau, table, tbl, ts, lw);
  rockerWithGrandma(ctx, tau, table, tbl, ts, lw);
  if (table.shake > 0) crumbs(ctx, tau);
}

/** One person alone, drawn as `supper` draws them this frame. */
function alone(ctx: Ctx, s: Scene, who: Who, tau: number, table: Table, tbl: Spot, ts: number, lw: number, house: Spot, hs: number): void {
  const d = NOW[who];
  if (d.act === "in") return;
  if (LANE.includes(who)) walker(ctx, s, who, d, tau, tbl, ts, house, hs);
  else if (who === "grandma" && FRONT.includes(who)) rockerWithGrandma(ctx, tau, table, tbl, ts, lw, false);
  else {
    pen(tbl.x, tbl.y, ts, 23);
    person(ctx, who, d, tau, table, tbl, ts, lw);
  }
}

/** Table-local spot of someone at the table: behind it, or settling into their seat. */
function place(who: Who, d: Doing): void {
  const kid = KIDS.has(who);
  let x = LX_IN + (d.r - 1);
  let y = STAY.has(who) ? LY_END : kid ? LY_KID : LY_ADULT;
  if (d.sit > 0) {
    const seat = SEATS[who];
    const k = d.sit;
    x += (seat.x - x) * k;
    y += ((seat.end ? 0 : BACK) - y) * k;
  }
  AT[who].x = x;
  AT[who].y = y;
}

/** Someone on the garden path, shrinking toward the porch door. */
function walker(ctx: Ctx, s: Scene, who: Who, d: Doing, tau: number, tbl: Spot, ts: number, house: Spot, hs: number): void {
  const kid = KIDS.has(who);
  // Down the porch steps, then a straight run to the table's left end.
  const doorX = house.x;
  const sillY = house.y + DOOR.sill * hs;
  const footY = house.y + DOOR.foot * hs;
  const endX = tbl.x + LX_IN * ts;
  const endY = tbl.y + (kid ? LY_KID : LY_ADULT) * ts;
  // The house is drawn smaller than life; a figure in its doorway fits the door, and grows
  // into the table's scale on the way down, on top of the path's own perspective.
  const doorSize = (DOOR_HEIGHT * hs) / (ADULT_HEIGHT * ts);
  const hz = s.horizonY;
  let x: number;
  let y: number;
  let g: number;
  if (d.r <= STEPS) {
    const k = d.r / STEPS;
    x = doorX;
    y = sillY + (footY - sillY) * k;
    g = doorSize;
  } else {
    const k = (d.r - STEPS) / (1 - STEPS);
    // Over toward the table near the house, then straight down to it (clear of Dad's arm).
    x = doorX + (endX - doorX) * (1 - (1 - k) * (1 - k));
    y = footY + (endY - footY) * k;
    const persp = (y - hz) / (endY - hz);
    const m0 = doorSize / ((footY - hz) / (endY - hz));
    g = persp * (m0 + (1 - m0) * smooth(k));
  }
  const p = POSE;
  reset(p);
  p.back = d.dir < 0 || (d.dir === 0 && d.r < STEPS && d.span - d.age < 0.3 && d.age > 0.1);
  p.step = d.dir !== 0 ? d.r * LANE_STEPS * Math.PI * 2 : NaN;
  carrying(p, d, tau);
  // Fading in and out of the doorway. The ink thins with the figure, so the family up by the
  // house reads in their colors, not as dark specks (a line no finer than WALKER_INK).
  ctx.globalAlpha = d.r < 0.02 ? Math.max(0.15, d.r / 0.02) : 1;
  figure(ctx, LOOKS[who], p, x, y, ts * g, Math.max(WALKER_INK, inkW(s, tbl.k) * g), SEED[who]);
  ctx.globalAlpha = 1;
}

function reset(p: Pose): void {
  p.back = false;
  p.look = 0;
  p.step = NaN;
  p.sit = 0;
  p.seat = 0;
  p.arms = "down";
  p.hx = 0;
  p.hy = 0;
  p.eat = 0;
  p.steam = NaN;
}

/** What the person carries, and their arms for it. */
function carrying(p: Pose, d: Doing, tau: number): void {
  const h = holding(d.who, tau, p.hold);
  // Steaming hot on the way out; and the pie goes back in short a slice.
  p.steam = (h.turkey || h.pie) && tau < T.stand ? tau : NaN;
  p.slice = tau >= T.slice;
  p.arms = h.turkey || h.pie || h.plates > 0 || h.cups > 0 || h.pitcher ? "carry" : "down";
}

/** Someone at the table: walking behind it, setting or picking something up, holding the cloth, or seated. */
function person(ctx: Ctx, who: Who, d: Doing, tau: number, table: Table, tbl: Spot, ts: number, lw: number): void {
  const kid = KIDS.has(who);
  const at = AT[who];
  const p = POSE;
  reset(p);
  p.step = d.dir !== 0 && d.sit === 0 ? (d.r * Math.PI * 2) / STRIDE : NaN;
  p.look = d.dir * 0.7;
  carrying(p, d, tau);
  if (d.act === "place" || d.act === "pick") p.arms = "reach";
  if (d.act === "hold" || d.act === "shake") {
    const side = at.x < 0 ? -1 : 1;
    const corner = clothCorner(table, tau);
    p.arms = "up";
    p.hx = side * (HW + OVER * 0.5) - at.x;
    p.hy = at.y - corner;
    p.look = -side * 0.5;
  }
  if (d.sit > 0) {
    p.sit = d.sit;
    p.seat = kid ? BENCH_SEAT : SEAT;
    const ph = PHASE[who];
    // Chatting: glances this way and that; the end seats face the table.
    const end = SEATS[who].end;
    p.look = (end ? -Math.sign(SEATS[who].x) * 0.55 : 0) + Math.sin((tau / 5 + ph) * Math.PI * 2) * (end ? 0.25 : 0.55);
    if (d.sit >= 1 && tau > T.served[1] && tau < T.eaten[1]) {
      // A forkful now and then while there is food on the plate.
      const k = (tau / 2.5 + ph) % 1;
      p.arms = "eat";
      p.eat = k < 0.35 ? Math.sin((k / 0.35) * Math.PI) : 0;
    }
  }
  figure(ctx, LOOKS[who], p, X(at.x), Y(at.y), ts, lw, SEED[who]);
  pen(tbl.x, tbl.y, ts, 23);
}

/** Local y of the cloth's corners: held up, coming down, or flapping as it is shaken. */
function clothCorner(table: Table, tau: number): number {
  const c = table.cloth;
  const y = HOLD_Y + (-(TH + DEPTH) - HOLD_Y) * c;
  return y + Math.sin(tau * 13) * 0.006 * table.shake;
}

/** Mom's red spindle chair behind the table: an arched top rail. */
function spindle(ctx: Ctx, lw: number): void {
  const x = SEATS.mom.x;
  ctx.beginPath();
  for (const sx of [-0.009, 0.009]) {
    M(ctx, x + sx, BACK - 0.092);
    S(ctx, x + sx, BACK - 0.05);
  }
  line(ctx, INK, len(0.005) + lw * 2);
  line(ctx, RED_CHAIR.base, len(0.005));
  ctx.beginPath();
  R(ctx, x - 0.027, BACK - 0.094, 0.009, 0.094);
  R(ctx, x + 0.018, BACK - 0.094, 0.009, 0.094);
  cel(ctx, RED_CHAIR, BACK - 0.094, BACK, lw, 0.2, 0.2);
  ctx.beginPath();
  M(ctx, x - 0.03, BACK - 0.09);
  Q(ctx, x, BACK - 0.122, x + 0.03, BACK - 0.09);
  L(ctx, x + 0.03, BACK - 0.08);
  Q(ctx, x, BACK - 0.11, x - 0.03, BACK - 0.08);
  ctx.closePath();
  cel(ctx, RED_CHAIR, BACK - 0.106, BACK - 0.08, lw, 0.3, 0.2);
}

/**
 * The neighbor's seat by the garden path: an apple crate turned up on end, no taller than the
 * table, so the family coming down the path never seems to stand on a chair back.
 */
function crate(ctx: Ctx, lw: number): void {
  const x = SEATS.neighbor.x;
  const h = SEAT + 0.002;
  ctx.beginPath();
  R(ctx, x - 0.019, BACK - h, 0.038, h);
  cel(ctx, CRATE, BACK - h, BACK, lw, 0.2, 0.25);
  ctx.beginPath();
  for (const k of [0.36, 0.68]) {
    M(ctx, x - 0.016, BACK - h * k);
    S(ctx, x + 0.016, BACK - h * k);
  }
  line(ctx, CRATE.shade, Math.max(1, lw * 0.8));
}

/** The kids' bench beside Mom's chair, mostly hidden by the table. */
function bench(ctx: Ctx, lw: number): void {
  const x = (SEATS.boy.x + SEATS.girl.x) / 2;
  ctx.beginPath();
  RS(ctx, x - 0.043, BACK - BENCH_SEAT, 0.007, BENCH_SEAT);
  RS(ctx, x + 0.036, BACK - BENCH_SEAT, 0.007, BENCH_SEAT);
  cel(ctx, BENCH, BACK - BENCH_SEAT, BACK, lw, 0.2, 0.25);
  ctx.beginPath();
  R(ctx, x - 0.048, BACK - BENCH_SEAT - 0.004, 0.096, 0.008);
  cel(ctx, BENCH, BACK - BENCH_SEAT - 0.004, BACK - BENCH_SEAT + 0.004, lw, 0.35, 0.25);
}

/** The table's legs: the back pair a step behind the front pair. */
function legs(ctx: Ctx, lw: number): void {
  ctx.beginPath();
  RS(ctx, -HW + 0.008, -TH, 0.008, TH - 0.012);
  RS(ctx, HW - 0.016, -TH, 0.008, TH - 0.012);
  cel(ctx, WOOD_DARK, -TH, -0.012, lw, 0.1, 0.3);
  ctx.beginPath();
  R(ctx, -HW + 0.002, -TH + 0.006, 0.01, TH - 0.006);
  R(ctx, HW - 0.012, -TH + 0.006, 0.01, TH - 0.006);
  cel(ctx, WOOD, -TH, 0, lw, 0.1, 0.3);
}

/** The bare wooden top while the cloth is off. */
function bareTop(ctx: Ctx, lw: number): void {
  ctx.beginPath();
  M(ctx, -HW - 0.004, -TH);
  L(ctx, -HW + 0.004, -TH - DEPTH);
  L(ctx, HW - 0.004, -TH - DEPTH);
  L(ctx, HW + 0.004, -TH);
  ctx.closePath();
  flat(ctx, WOOD.light, lw);
  ctx.beginPath();
  R(ctx, -HW - 0.004, -TH, 2 * HW + 0.008, 0.008);
  cel(ctx, WOOD, -TH, -TH + 0.008, lw, 0.2, 0.3);
}

/** The cloth lying on the table: the top we look down on, the checked drop with its scalloped hem. */
function restingCloth(ctx: Ctx, lw: number): void {
  ctx.beginPath();
  M(ctx, -HW - OVER, -TH);
  L(ctx, -HW + 0.002, -TH - DEPTH);
  L(ctx, HW - 0.002, -TH - DEPTH);
  L(ctx, HW + OVER, -TH);
  ctx.closePath();
  flat(ctx, CLOTH.light, lw);
  ctx.beginPath();
  M(ctx, -HW - OVER, -TH);
  L(ctx, HW + OVER, -TH);
  L(ctx, HW + OVER + 0.002, -TH + HEM);
  const w = (2 * (HW + OVER) + 0.004) / SCALLOPS;
  for (let i = 0; i < SCALLOPS; i++) {
    const x1 = HW + OVER + 0.002 - w * (i + 1);
    Q(ctx, x1 + w / 2, -TH + HEM + 0.011, x1, -TH + HEM);
  }
  ctx.closePath();
  checked(ctx, -TH - 0.01, -TH + HEM + 0.012, lw);
}

/** Fill the current path as the checked cloth (between local y0 and y1) and ink it. */
function checked(ctx: Ctx, y0: number, y1: number, lw: number): void {
  ctx.fillStyle = CLOTH.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = CHECK;
  const w = 2 * (HW + OVER) + 0.06;
  for (let cx = -HW - OVER - 0.0075; cx < HW + OVER + 0.01; cx += 0.03) ctx.fillRect(X(cx), Y(y0), len(0.015), len(y1 - y0));
  for (let cy = -TH + 0.006; cy < y1; cy += 0.02) ctx.fillRect(X(-w / 2), Y(cy), len(w), len(0.01));
  for (let cy = -TH - 0.014; cy > y0 - 0.06; cy -= 0.02) ctx.fillRect(X(-w / 2), Y(cy), len(w), len(0.01));
  ctx.fillStyle = CLOTH.shade;
  ctx.fillRect(X(-w / 2), Y(y1 - 0.02), len(w), len(0.03));
  ctx.restore();
  line(ctx, INK, lw);
}

/** Points along the raised cloth's hem. */
const HEM_PTS = 9;

/**
 * The cloth in the air: held up by its corners, shaken out, or billowing down onto the table
 * (`table.cloth` 0 up .. 1 down), turning into the resting cloth as it settles.
 */
function raisedCloth(ctx: Ctx, table: Table, tau: number, lw: number): void {
  const c = table.cloth;
  const sh = table.shake;
  const yc = clothCorner(table, tau);
  // Top edge: from corner to corner, sagging when held, bulging up with the air under it as it falls.
  const air = Math.sin(Math.PI * c);
  const wt = HW + OVER * 0.5 + (-0.002 - OVER * 0.5) * c;
  const wb = HW + OVER * 0.5 + (OVER * 0.5 + 0.002) * c + 0.008 * air;
  const mid = yc + 0.008 * (1 - c) - 0.03 * air;
  const drop = HANG * (1 - c) * (1 - 0.35 * sh * (0.5 + 0.5 * Math.sin(tau * 13 + 1))) + (DEPTH + HEM) * c;
  const wave = 0.003 * (1 - c) + 0.009 * sh;
  ctx.beginPath();
  M(ctx, -wt, yc);
  Q(ctx, 0, 2 * mid - yc, wt, yc);
  L(ctx, wb, yc + drop);
  for (let i = HEM_PTS - 1; i >= 0; i--) {
    const f = i / (HEM_PTS - 1);
    const x = -wb + 2 * wb * f;
    const up = 4 * f * (1 - f) * (mid - yc);
    const y = yc + drop + up + Math.sin(f * 9 + tau * (6 + 8 * sh)) * wave + (1 - Math.abs(2 * f - 1)) * 0.004 * c;
    S(ctx, x, y);
  }
  ctx.closePath();
  checked(ctx, Math.min(yc, mid) - 0.02, yc + drop + 0.02, lw);
  // Settling: the top we look down on comes back into view.
  if (c > 0.82) {
    ctx.globalAlpha = smooth((c - 0.82) / 0.18);
    ctx.beginPath();
    M(ctx, -HW - OVER, -TH);
    L(ctx, -HW + 0.002, -TH - DEPTH);
    L(ctx, HW - 0.002, -TH - DEPTH);
    L(ctx, HW + OVER, -TH);
    ctx.closePath();
    flat(ctx, CLOTH.light, lw);
    ctx.globalAlpha = 1;
  }
}

/** Plates, cups and dishes on the cloth, back to front. */
/** The places on the cloth: each plate, and its cup (behind and beside it in the back row, in front at the ends). */
const PLATE_Y = PLACES.map((_, i) => -TH - DEPTH * PLACE_DEPTH[i]!);
const BACK_ROW = PLACES.map((_, i) => i >= 1 && i <= 4);
const CUP_Y = PLATE_Y.map((y, i) => (BACK_ROW[i] ? y - 0.0035 : y - 0.006));
/** This frame's cups standing in the back row, and at the ends. */
const BACK_CUPS = PLACES.map(() => false);
const END_CUPS = PLACES.map(() => false);

/** The places' cups and plates, the pitcher, the pie and the turkey, back to front. */
function dinner(ctx: Ctx, table: Table, tau: number, thin: number): void {
  const top = -TH;
  const steam = tau < 16 ? tau : NaN;
  for (let i = 0; i < PLACES.length; i++) {
    BACK_CUPS[i] = table.cup[i]! && BACK_ROW[i]!;
    END_CUPS[i] = table.cup[i]! && !BACK_ROW[i]!;
  }
  cups(ctx, CUP_X, CUP_Y, BACK_CUPS, thin);
  plates(ctx, PLACES, PLATE_Y, table.plate, table.food, thin);
  if (table.pitcher) pitcher(ctx, PITCHER_X, top - DEPTH * 0.45, thin);
  if (table.pie) pie(ctx, PIE_X, top - DEPTH * 0.42, thin, table.slice, steam);
  cups(ctx, CUP_X, CUP_Y, END_CUPS, thin);
  if (table.turkey) turkeyPlatter(ctx, TURKEY_X, top - DEPTH * 0.22, thin, steam);
}

/** Dad's blue kitchen chair at the left end, side on, facing the table. */
function kitchenChair(ctx: Ctx, lw: number): void {
  const x = SEATS.dad.x;
  ctx.beginPath();
  R(ctx, x - 0.022, -0.088, 0.008, 0.088);
  R(ctx, x + 0.015, -SEAT, 0.007, SEAT);
  cel(ctx, BLUE_CHAIR, -0.088, 0, lw, 0.2, 0.2);
  ctx.beginPath();
  R(ctx, x - 0.024, -SEAT - 0.004, 0.048, 0.009);
  cel(ctx, BLUE_CHAIR, -SEAT - 0.004, -SEAT + 0.005, lw, 0.4, 0.2);
  ctx.beginPath();
  R(ctx, x - 0.026, -0.084, 0.012, 0.036);
  flat(ctx, BLUE_CHAIR.light, lw);
  ctx.beginPath();
  M(ctx, x - 0.016, -0.012);
  L(ctx, x + 0.017, -0.012);
  line(ctx, INK, lw * 1.2);
}

/** Grandma's green rocking chair at the right end, side on, facing the table; with her in it, rocking after supper. */
function rockerWithGrandma(ctx: Ctx, tau: number, table: Table, tbl: Spot, ts: number, lw: number, chair = true): void {
  const d = NOW.grandma;
  const seated = d.act !== "in" && d.r > 1 && AT.grandma.y > -0.009;
  const x = SEATS.grandma.x;
  // A gentle rock while she sits on after supper.
  const rock = seated ? rocking(tau) : 0;
  if (rock !== 0) {
    ctx.save();
    ctx.translate(X(x), Y(0));
    ctx.rotate(rock);
    ctx.translate(-X(x), -Y(0));
  }
  pen(tbl.x, tbl.y, ts, 29);
  if (chair) rocker(ctx, x, lw);
  if (seated) person(ctx, "grandma", d, tau, table, tbl, ts, lw);
  if (rock !== 0) ctx.restore();
}

/** Rocking angle (radians): after the meal until she gets up for the cloth. */
function rocking(tau: number): number {
  const a = 24.5;
  const b = 32.4;
  if (tau < a || tau > b) return 0;
  const env = Math.min(1, (tau - a) / 1.2, (b - tau) / 1.2);
  return 0.04 * env * Math.sin(((tau - a) / 2.2) * Math.PI * 2);
}

function rocker(ctx: Ctx, x: number, lw: number): void {
  const wood = ROCKER;
  ctx.beginPath();
  M(ctx, x - 0.034, -0.011);
  Q(ctx, x + 0.002, 0.007, x + 0.036, -0.009);
  M(ctx, x - 0.018, -0.002);
  L(ctx, x - 0.018, -SEAT - 0.002);
  M(ctx, x + 0.018, 0.0);
  L(ctx, x + 0.021, -SEAT - 0.002);
  L(ctx, x + 0.031, -0.1);
  M(ctx, x - 0.02, -SEAT - 0.002);
  L(ctx, x - 0.02, -0.056);
  line(ctx, INK, len(0.008) + lw * 2);
  line(ctx, wood.base, len(0.008));
  ctx.beginPath();
  M(ctx, x + 0.018, -0.04);
  L(ctx, x + 0.024, -0.094);
  L(ctx, x + 0.034, -0.092);
  L(ctx, x + 0.028, -0.038);
  ctx.closePath();
  cel(ctx, wood, -0.094, -0.038, lw, 0.3, 0.2);
  ctx.beginPath();
  R(ctx, x - 0.026, -SEAT - 0.006, 0.052, 0.009);
  R(ctx, x - 0.028, -0.061, 0.05, 0.007);
  cel(ctx, wood, -0.061, -SEAT + 0.003, lw, 0.35, 0.2);
}

/** Crumbs flying off the cloth as it is shaken out over the lawn. */
const CRUMBS = Array.from({ length: 14 }, (_, i) => ({
  t0: T.shake[0] + 0.25 + hash(i + 900) * (T.shake[1] - T.shake[0] - 1.3),
  x: (hash(i + 910) - 0.5) * 2 * HW,
  vx: (hash(i + 920) - 0.5) * 0.09,
  vy: -0.02 - hash(i + 930) * 0.035,
}));
const CRUMB_LIFE = 0.9;
const GRAVITY = 0.14;

function crumbs(ctx: Ctx, tau: number): void {
  const y0 = HOLD_Y + HANG * 0.8;
  ctx.beginPath();
  for (const c of CRUMBS) {
    const a = tau - c.t0;
    if (a < 0 || a > CRUMB_LIFE) continue;
    const y = y0 + c.vy * a + 0.5 * GRAVITY * a * a;
    if (y > -0.004) continue;
    circle(ctx, X(c.x + c.vx * a), Y(y), Math.max(1, len(0.0016)));
  }
  ctx.fillStyle = CRUMB;
  ctx.fill();
}
