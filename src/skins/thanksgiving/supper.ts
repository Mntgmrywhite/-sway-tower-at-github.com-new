// Thanksgiving supper in the backyard, as a pure timeline (no drawing): the family of the hollow
// sets the table, sits down to eat, clears it and sets it again, round and round on a 40-second
// cycle for as long as the player stands there.
//
// The cast, townsfolk of the hollow in everyday autumn clothes (folk.ts): Grandma in her apron,
// Dad in a sweater, Mom with a scarf, a girl, a boy and the neighbor from up the lane in his knit
// cap. Each runs a script of keyframes on one route: in the house (not drawn), down the garden
// path from the porch door to the foot of the path behind the table's left end (0..1), then
// along behind the table (local table units: route 1 = LX_IN). Dad and Grandma never leave the
// table, so theirs is always a table spot. Between keyframes a person walks; a keyframe's act
// holds until the next one.
//
// Behind the table there is room for one row of people, so nobody ever passes anybody: they come
// down the path one at a time in the order of their seats from the right (the girl, the boy, Mom,
// the neighbor), and go back up it in the opposite order. Everyone carries their own things out
// and back in: the girl a stack of plates with two cups on it, the boy a tray of cups with the
// milk jug, Mom the turkey, the neighbor his pie. Each thing is in someone's hands or on the
// table, never both and never neither (`onTable`, `holding`).
//
// The first set lands in the first 10 s (the owner's rule): the cloth billows down at once, the
// girl lays the plates round and the boy the cups, Mom brings the turkey and the neighbor a pie,
// and everyone is seated by 9 s. They eat, stand at 21 s and carry everything back in up the
// path, Dad and Grandma rest a while, then shake the cloth out over the lawn and hold it up while
// the kids come back out with the plates and cups, and at 40 s it billows down again: the
// cycle's end is its start.

/** Seconds per round of set, supper, clear. */
export const SUPPER_PERIOD = 40;

// The table, in local units (u at the tower's depth, origin on the ground between the front legs).
/** Half width of the table top. */
export const HW = 0.12;
/** Height of the table top's front edge. */
export const TH = 0.045;
/** How much of the top we look down on. */
export const DEPTH = 0.024;
/** The cloth's drop below the front edge. */
export const HEM = 0.024;
/** The cloth's overhang past the top's front corners. */
export const OVER = 0.012;

/** Where people stand behind the table (local y of their feet): grown-ups a step further back. */
export const LY_ADULT = -0.018;
export const LY_KID = -0.011;
/** Where Dad and Grandma stand at the table's ends to hold the cloth, just behind their chairs. */
export const LY_END = -0.01;
/** Where the garden path meets the table: behind its left end, clear of Dad's raised arm. */
export const LX_IN = -0.088;

/** Table-local x of a spot behind the table, as a route position. */
export function tx(x: number): number {
  return 1 + x - LX_IN;
}

export type Who = "grandma" | "dad" | "mom" | "girl" | "boy" | "neighbor";

/**
 * Where each person sits: table-local x, and whether the seat is at an end (front depth, turned
 * to the table). The back row from the left: the neighbor by the path, Mom, then the kids' bench.
 * Seated, nobody's elbows touch.
 */
export const SEATS: Record<Who, { x: number; end: boolean }> = {
  dad: { x: -(HW + 0.032), end: true },
  neighbor: { x: -0.09, end: false },
  mom: { x: -0.027, end: false },
  boy: { x: 0.029, end: false },
  girl: { x: 0.079, end: false },
  grandma: { x: HW + 0.032, end: true },
};

/**
 * Where each stands to set down (and pick up) the dishes in the middle: the row pressed up to
 * Grandma's end, as close as they go without touching, so Mom can reach the middle of the table.
 */
const UP: Record<"girl" | "boy" | "mom" | "neighbor", number> = { girl: 0.0935, boy: 0.0435, mom: -0.015, neighbor: -0.079 };

/** The six places (plate and cup): Dad's end, the back row (neighbor, Mom, boy, girl), Grandma's end. */
export const PLACES = [-0.1, SEATS.neighbor.x, SEATS.mom.x, SEATS.boy.x, SEATS.girl.x, 0.1] as const;
/** Back-row places sit near the back edge; the end places nearer the front. */
export const PLACE_DEPTH = [0.32, 0.68, 0.68, 0.68, 0.68, 0.32] as const;
/** Each place's cup: beside the plate toward the middle in the back row, at the ends just outside it. */
export const CUP_X = [-0.104, PLACES[1] + 0.012, PLACES[2] + 0.012, PLACES[3] + 0.012, PLACES[4] - 0.012, 0.104] as const;
export const TURKEY_X = UP.mom;
export const PIE_X = -0.068;
export const PITCHER_X = 0.055;

/** The things on the table: the plates (0..5), the cups (6..11), the turkey, the pie and the milk jug. */
export const plate = (i: number): number => i;
export const cup = (i: number): number => 6 + i;
export const TURKEY = 12;
export const PIE = 13;
export const PITCHER = 14;
export const ITEMS = 15;

/** Who carries each thing out of the house and back in. */
export const OWNER: readonly Who[] = [
  ...Array<Who>(6).fill("girl"),
  ...Array<Who>(4).fill("boy"),
  "girl",
  "girl",
  "mom",
  "neighbor",
  "boy",
];

/** What a person is doing: inside the house, walking or standing, holding the cloth up, setting
 * things down, picking them up, sitting in their seat, shaking out the cloth. */
export type Act = "in" | "go" | "hold" | "place" | "pick" | "sit" | "shake";

/** A keyframe: from time t, at route position r (walked to from the previous keyframe), doing act (with these things). */
type Key = readonly [t: number, r: number, act: Act, items?: readonly number[]];

/** A thing set down is on the table this far into the reach; one picked up leaves it this far in. */
const PLACE_AT = 0.2;
const PICK_AT = 0.15;

// The route's spots.
const FOOT = 1;
const T_GIRL = tx(UP.girl);
const T_BOY = tx(UP.boy);
const T_MOM = tx(UP.mom);
const T_NEIGHBOR = tx(UP.neighbor);
/** The boy sets down the middle cup from here. */
const T_BOY_MID = tx(CUP_X[2]);
/** Waiting just short of the path's foot for the one ahead to get well up it. */
const T_BOY_WAIT = tx(-0.03);

const SCRIPTS: Record<Who, readonly Key[]> = {
  // The plates (and Grandma's and her own cup) from Dad's end round to Grandma's; back the other way.
  girl: [
    [0, FOOT, "go"],
    [1.4, FOOT, "place", [plate(0)]],
    [1.7, FOOT, "place", [plate(1)]],
    [2.0, FOOT, "go"],
    [2.8, tx(PLACES[2]), "place", [plate(2)]],
    [3.1, tx(PLACES[2]), "go"],
    [3.85, tx(PLACES[3]), "place", [plate(3)]],
    [4.15, tx(PLACES[3]), "go"],
    [4.85, tx(PLACES[4]), "place", [plate(4), cup(4)]],
    [5.25, tx(PLACES[4]), "go"],
    [5.5, T_GIRL, "place", [plate(5), cup(5)]],
    [5.9, T_GIRL, "go"],
    [8.3, T_GIRL, "go"],
    [8.6, tx(SEATS.girl.x), "sit"],
    [21.0, tx(SEATS.girl.x), "go"],
    [21.3, T_GIRL, "pick", [plate(5), cup(5)]],
    [21.7, T_GIRL, "go"],
    [23.6, T_GIRL, "go"],
    [23.85, tx(PLACES[4]), "pick", [plate(4), cup(4)]],
    [24.25, tx(PLACES[4]), "go"],
    [24.55, tx(PLACES[4]), "go"],
    [25.2, tx(PLACES[3]), "pick", [plate(3)]],
    [25.5, tx(PLACES[3]), "go"],
    [26.4, tx(PLACES[3]), "go"],
    [27.1, tx(PLACES[2]), "pick", [plate(2)]],
    [27.4, tx(PLACES[2]), "go"],
    [28.0, tx(PLACES[2]), "go"],
    [28.8, FOOT, "pick", [plate(1)]],
    [29.1, FOOT, "pick", [plate(0)]],
    [29.4, FOOT, "go"],
    [31.8, 0, "go"],
    [32.0, 0, "in"],
    [36.2, 0, "go"],
    [38.6, FOOT, "go"],
  ],
  // The cups after her (and the milk jug), then back along behind her sister's plates.
  boy: [
    [0, 0.3, "go"],
    [2.2, 0.38, "go"],
    [3.6, FOOT, "place", [cup(0)]],
    [3.9, FOOT, "place", [cup(1)]],
    [4.2, FOOT, "go"],
    [5.2, T_BOY_MID, "place", [cup(2)]],
    [5.5, T_BOY_MID, "go"],
    [6.3, T_BOY, "place", [cup(3)]],
    [6.6, T_BOY, "place", [PITCHER]],
    [6.9, T_BOY, "go"],
    [8.1, T_BOY, "go"],
    [8.4, tx(SEATS.boy.x), "sit"],
    [21.0, tx(SEATS.boy.x), "go"],
    [21.45, T_BOY, "pick", [PITCHER]],
    [21.75, T_BOY, "pick", [cup(3)]],
    [22.05, T_BOY, "go"],
    [23.2, T_BOY, "go"],
    [23.7, T_BOY_MID, "pick", [cup(2)]],
    [24.0, T_BOY_MID, "go"],
    [24.4, T_BOY_WAIT, "go"],
    [25.6, T_BOY_WAIT, "go"],
    [26.1, FOOT, "pick", [cup(1)]],
    [26.4, FOOT, "pick", [cup(0)]],
    [26.7, FOOT, "go"],
    [29.1, 0, "go"],
    [29.3, 0, "in"],
    [39.1, 0, "go"],
  ],
  // The turkey down the path to the middle of the table.
  mom: [
    [0, 0, "in"],
    [2.4, 0, "go"],
    [4.3, 0.36, "go"],
    [5.3, FOOT, "go"],
    [6.6, T_MOM, "place", [TURKEY]],
    [6.9, T_MOM, "go"],
    [7.7, T_MOM, "go"],
    [8.0, tx(SEATS.mom.x), "sit"],
    [21.0, tx(SEATS.mom.x), "go"],
    [21.55, T_MOM, "pick", [TURKEY]],
    [21.85, T_MOM, "go"],
    [23.0, T_MOM, "go"],
    [24.0, FOOT, "go"],
    [24.3, FOOT, "go"],
    [26.7, 0, "go"],
    [26.9, 0, "in"],
  ],
  // His pie, last down the path and first back up it.
  neighbor: [
    [0, 0, "in"],
    [4.3, 0, "go"],
    [5.4, 0.36, "go"],
    [6.9, FOOT, "go"],
    [7.1, T_NEIGHBOR, "place", [PIE]],
    [7.4, T_NEIGHBOR, "go"],
    [7.5, T_NEIGHBOR, "go"],
    [7.7, tx(SEATS.neighbor.x), "sit"],
    [21.0, tx(SEATS.neighbor.x), "go"],
    [21.65, T_NEIGHBOR, "pick", [PIE]],
    [21.95, T_NEIGHBOR, "go"],
    [22.15, FOOT, "go"],
    [24.55, 0, "go"],
    [24.75, 0, "in"],
  ],
  dad: [
    [0, tx(-(HW + 0.026)), "hold"],
    [1.4, tx(-(HW + 0.026)), "go"],
    [1.8, tx(-(HW + 0.026)), "sit"],
    [33.0, tx(-(HW + 0.026)), "go"],
    [33.6, tx(-(HW + 0.026)), "hold"],
    [34.4, tx(-(HW + 0.026)), "shake"],
    [38.6, tx(-(HW + 0.026)), "hold"],
  ],
  grandma: [
    [0, tx(HW + 0.026), "hold"],
    [1.4, tx(HW + 0.026), "go"],
    [1.8, tx(HW + 0.026), "sit"],
    [33.0, tx(HW + 0.026), "go"],
    [33.6, tx(HW + 0.026), "hold"],
    [34.4, tx(HW + 0.026), "shake"],
    [38.6, tx(HW + 0.026), "hold"],
  ],
};

export const CAST: readonly Who[] = ["grandma", "dad", "mom", "girl", "boy", "neighbor"];
export const KIDS: ReadonlySet<Who> = new Set<Who>(["girl", "boy"]);
/** Dad and Grandma stay at the table the whole time. */
export const STAY: ReadonlySet<Who> = new Set<Who>(["dad", "grandma"]);

/** When each thing is set on the table and when it is picked up again (seconds into the cycle), from the scripts. */
export const ON: readonly number[] = itemTimes("place", PLACE_AT);
export const OFF: readonly number[] = itemTimes("pick", PICK_AT);

function itemTimes(act: "place" | "pick", at: number): number[] {
  const out = Array<number>(ITEMS).fill(NaN);
  for (const who of CAST) {
    for (const [t, , a, items] of SCRIPTS[who]) {
      if (a !== act || !items) continue;
      for (const i of items) {
        if (OWNER[i] !== who || !Number.isNaN(out[i]!)) throw new Error(`supper: ${who} cannot ${act} thing ${i}`);
        out[i] = t + at;
      }
    }
  }
  if (out.some(Number.isNaN)) throw new Error(`supper: something is never ${act}d`);
  return out;
}

// Times (s into the cycle) that the table's cloth and food read, and the tests.
export const T = {
  /** The cloth billows down onto the table. */
  clothDown: [0, 1.4],
  /** Food dished out onto the plates, then eaten. */
  served: [8.9, 9.9],
  eaten: [10, 18],
  /** A slice of pie gone. */
  slice: 13,
  /** The back row stands up to clear. */
  stand: 21,
  /** Dad and Grandma lift the cloth off, shake it out, and hold it up for the next set. */
  lift: [33.6, 34.4],
  shake: [34.4, 38.6],
} as const;

/** Seconds into the supper's cycle at scene time t. */
export function cycleTime(t: number): number {
  const k = t / SUPPER_PERIOD;
  return (k - Math.floor(k)) * SUPPER_PERIOD;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number): number => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/** How long sitting down or getting up takes. */
const SIT_T = 0.35;
/** Walks ease in and out over this long at each end. */
const RAMP = 0.18;

/** Eased progress through a walk of length d seconds, at s seconds in (linear in the middle). */
function walkEase(s: number, d: number): number {
  if (d <= 0) return 1;
  const r = Math.min(RAMP, d / 2);
  const v = 1 / (d - r); // speed in the middle, so the whole walk covers 1
  if (s <= 0) return 0;
  if (s >= d) return 1;
  if (s < r) return (v * s * s) / (2 * r);
  if (s > d - r) return 1 - (v * (d - s) * (d - s)) / (2 * r);
  return v * (s - r / 2);
}

/** A person's state at one moment. */
export interface Doing {
  who: Who;
  act: Act;
  /** Route position: 0..1 on the garden path (0 at the door), past 1 behind the table. */
  r: number;
  /** Which way they move along the route: 1 toward the table end (down the path, or right behind the table), -1 back, 0 standing. */
  dir: number;
  /** 0 standing .. 1 seated. */
  sit: number;
  /** Seconds into the current act (for reaches and the like). */
  age: number;
  /** Length of the current act, seconds. */
  span: number;
}

/** Where the person is at time τ (seconds into the cycle). */
export function doing(who: Who, tau: number): Doing {
  const keys = SCRIPTS[who];
  let i = keys.length - 1;
  for (let k = 0; k < keys.length; k++) {
    if (keys[k]![0] > tau) {
      i = k - 1;
      break;
    }
  }
  const a = keys[i]!;
  const bi = i + 1 < keys.length ? i + 1 : 0;
  const b = keys[bi]!;
  const tb = bi === 0 ? b[0] + SUPPER_PERIOD : b[0];
  const span = tb - a[0];
  const age = tau - a[0];
  // Walk toward the next keyframe's spot over this whole span (an act at a standstill has a == b).
  const r = a[2] === "in" ? a[1] : a[1] + (b[1] - a[1]) * walkEase(age, span);
  const dir = a[2] !== "in" && Math.abs(b[1] - a[1]) > 1e-9 && age > 0 && age < span ? Math.sign(b[1] - a[1]) : 0;
  // Sitting eases in at the start of a sit; getting up eases out from its end, whatever follows.
  let sit = 0;
  if (a[2] === "sit") sit = smooth(age / SIT_T);
  else {
    const up = sinceSit(keys, i, tau);
    if (up < SIT_T) sit = 1 - smooth(up / SIT_T);
  }
  return { who, act: a[2], r, dir, sit, age, span };
}

/** Seconds since the last sit in `keys` ended, at time τ in keyframe i (Infinity if longer ago than a getting-up). */
function sinceSit(keys: readonly Key[], i: number, tau: number): number {
  for (let k = i; k > i - keys.length; k--) {
    const j = (k + keys.length) % keys.length;
    const end = keys[j]![0] + (j > i ? -SUPPER_PERIOD : 0);
    if (tau - end >= SIT_T) return Infinity;
    const before = keys[(j - 1 + keys.length) % keys.length]!;
    if (before[2] === "sit") return tau - end;
  }
  return Infinity;
}

/** Whether thing i is on the table at time τ. */
export function onTable(i: number, tau: number): boolean {
  return tau >= ON[i]! && tau < OFF[i]!;
}

/** What a person has in their hands. */
export interface Holding {
  plates: number;
  cups: number;
  turkey: boolean;
  pie: boolean;
  pitcher: boolean;
}

/** What `who` carries at time τ: their things not on the table, while they are out of the house. Fills `out`. */
export function holding(who: Who, tau: number, out: Holding): Holding {
  out.plates = 0;
  out.cups = 0;
  out.turkey = false;
  out.pie = false;
  out.pitcher = false;
  if (doing(who, tau).act === "in") return out;
  for (let i = 0; i < ITEMS; i++) {
    if (OWNER[i] !== who || onTable(i, tau)) continue;
    if (i < 6) out.plates++;
    else if (i < 12) out.cups++;
    else if (i === TURKEY) out.turkey = true;
    else if (i === PIE) out.pie = true;
    else out.pitcher = true;
  }
  return out;
}

/** A key moment's table state, read by the drawing and the tests. */
export interface Table {
  /** The cloth: 0 held up in the air, 1 lying on the table. */
  cloth: number;
  /** 0..1 how hard the cloth is being shaken (0 still). */
  shake: number;
  /** Per place: plate and cup on the table, food on the plate (0..1). */
  plate: boolean[];
  cup: boolean[];
  food: number[];
  turkey: boolean;
  pitcher: boolean;
  pie: boolean;
  /** A slice of pie gone. */
  slice: boolean;
}

/** The table at time τ (seconds into the cycle). Allocates; use `tableInto` per frame. */
export function tableAt(tau: number): Table {
  return tableInto(
    {
      cloth: 0,
      shake: 0,
      plate: Array<boolean>(6).fill(false),
      cup: Array<boolean>(6).fill(false),
      food: Array<number>(6).fill(0),
      turkey: false,
      pitcher: false,
      pie: false,
      slice: false,
    },
    tau,
  );
}

/** Fill `out` with the table at time τ. */
export function tableInto(out: Table, tau: number): Table {
  const [d0, d1] = T.clothDown;
  const [l0, l1] = T.lift;
  if (tau < d1) out.cloth = smooth((tau - d0) / (d1 - d0));
  else if (tau < l0) out.cloth = 1;
  else out.cloth = 1 - smooth((tau - l0) / (l1 - l0));
  const [s0, s1] = T.shake;
  out.shake = tau >= s0 && tau < s1 ? Math.min(1, (tau - s0) / 0.4, (s1 - tau) / 0.4) : 0;
  const [f0, f1] = T.served;
  const [e0, e1] = T.eaten;
  for (let i = 0; i < 6; i++) {
    out.plate[i] = onTable(plate(i), tau);
    out.cup[i] = onTable(cup(i), tau);
    // Dished out one place after another, then eaten bit by bit.
    const served = tau >= f0 + ((f1 - f0) * i) / 6 && tau < T.stand;
    out.food[i] = served ? 1 - clamp01((tau - e0 - i * 0.4) / (e1 - e0 - 2.4)) : 0;
  }
  out.turkey = onTable(TURKEY, tau);
  out.pitcher = onTable(PITCHER, tau);
  out.pie = onTable(PIE, tau);
  out.slice = tau >= T.slice;
  return out;
}

/** How many of the family are sitting down (fully). */
export function seated(tau: number): number {
  let n = 0;
  for (const who of CAST) if (doing(who, tau).sit >= 1) n++;
  return n;
}
