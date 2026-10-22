import { afterEach, describe, expect, it } from "vitest";
import { kitFor } from "../../base/style";
import { halloween } from "../halloween";
import type { Scene } from "../skin";
import { skyBack } from "./backdrop";
import { front } from "./front";
import { churchyard } from "./graveyard";
import { hillOnly } from "./hollow";
import { isles } from "./isles";
import { mansion } from "./mansion";
import { shops, shopsOver } from "./shops";
import { bellTower, cathedral, chimneyStack, nearSpire, roofs } from "./skyline";
import { drowned } from "./drowned";
import { cemetery } from "./village";
import { HALO_REACH, moonAt } from "./sky";
import { ANCHORS, LAYERS, SLOT, stageAt, type LaneBox, type Pane, type Perch, type Pool, type Ridge, type Stage } from "./stage";
import { breathe, column, context, mask, MIN_ZOOM, sceneAt, SCREENS } from "./test-scene";
import { mistTop } from "./lines";
import { LOOP_PERIOD, LOOP_START, toneOf } from "./tone";

// Free the canvases' pixel reads between tests (see breathe).
afterEach(breathe);

// The stage the cast performs on (stage.ts): every anchor is computed from the scenery's own
// geometry, is pure and allocates nothing, keeps its id at every height, and when it is in view its
// room (the space a performer needs there) is on screen, clear of the tower's column above the
// floor line, of the moon (free sky of its halo too), of the HUD and of the screen's edges, and it sits on
// something actually drawn (a chimney under the raven's perch, a window behind a pane). Each stretch
// of the height story has the anchors its cast needs (the plan's table 3.4).

type Box = { x0: number; y0: number; x1: number; y1: number };
const POOLS = ["chimneys", "ridges", "eaves", "stones", "rails", "panes", "hideouts", "roads", "roosts", "boughs", "lanes", "deep"] as const;
type PoolName = (typeof POOLS)[number];

/** The space a performer needs at an anchor (screen px). */
function room(name: PoolName, a: Readonly<Record<string, number>>, s: Scene): Box {
  const u = s.u;
  switch (name) {
    case "chimneys":
    case "boughs":
      return { x0: a.x! - a.room!, x1: a.x! + a.room!, y0: a.y! - a.room! * 1.6, y1: a.y! };
    case "stones":
      return { x0: a.x! - a.room!, x1: a.x! + a.room!, y0: a.y! - a.room! * 2.6, y1: a.y! };
    case "roosts":
      return { x0: a.x! - a.room!, x1: a.x! + a.room!, y0: a.y! - a.room!, y1: a.y! + a.room! * 0.5 };
    case "eaves":
      return { x0: a.x! - u * 0.012, x1: a.x! + u * 0.012, y0: a.y!, y1: a.y! + a.room! };
    case "ridges":
    case "rails":
      return { x0: Math.min(a.hx!, a.ex!), x1: Math.max(a.hx!, a.ex!), y0: Math.min(a.hy!, a.ey!) - u * 0.04 * a.k!, y1: Math.max(a.hy!, a.ey!) };
    case "panes":
      return { x0: a.x!, x1: a.x! + a.w!, y0: a.y!, y1: a.y! + a.h! };
    case "hideouts":
      return { x0: a.x0!, x1: a.x1!, y0: a.rimY! - u * 0.035 * a.k!, y1: a.rimY! };
    case "roads": {
      // The road itself (sampled along its curve), with a little room above it for the carriage.
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i <= 20; i++) {
        const f = i / 20;
        const x = (1 - f) * (1 - f) * a.x0! + 2 * (1 - f) * f * a.xm! + f * f * a.x1!;
        const y = (1 - f) * (1 - f) * a.y0! + 2 * (1 - f) * f * a.ym! + f * f * a.y1!;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
      return { x0, x1, y0: y0 - u * 0.02 * a.k!, y1 };
    }
    default:
      return { x0: a.x0!, x1: a.x1!, y0: a.y0!, y1: a.y1! };
  }
}

function each(st: Readonly<Stage>, fn: (name: PoolName, a: Readonly<Record<string, number>>) => void): void {
  for (const name of POOLS) {
    const p = st[name] as Pool<unknown>;
    for (let i = 0; i < p.n; i++) fn(name, p.items[i] as Readonly<Record<string, number>>);
  }
}

const VIEWS = [...SCREENS.map(([W, H]) => [W, H, 1] as const), [390, 844, MIN_ZOOM] as const, [834, 1194, MIN_ZOOM] as const];
/** A level in every stretch: Main Street, the rooftops, the skyline, the storm, the spiral sky, the loop's isles, witching hour and storm. */
const LEVELS = [0, 8, 20, 26, 38, 45, 52, 64, 70, 80, 100, 110, 126, 136, 146, 160, 175, 190, 205, 215];
const MOMENTS = [0.5, 3.3, 7.1];

describe("halloween stage", () => {
  it("is pure and allocates nothing: the same objects every frame, the same values for the same scene", () => {
    const a = sceneAt(390, 844, 45, 3.3);
    const st = stageAt(a);
    const first = JSON.stringify(st);
    const items = POOLS.map((p) => (st[p] as Pool<unknown>).items);
    const again = stageAt(sceneAt(375, 667, 130, 9.1));
    expect(again, "the same stage object").toBe(st);
    POOLS.forEach((p, i) => expect((again[p] as Pool<unknown>).items, p).toBe(items[i]));
    expect(JSON.stringify(stageAt(sceneAt(390, 844, 45, 3.3))), "the same scene, the same stage").toBe(first);
  });

  it("keeps every anchor's id at every height, unique in the whole story", () => {
    const ids = (st: Readonly<Stage>) => {
      const out: number[] = [];
      each(st, (_n, a) => out.push(a.id!));
      return out;
    };
    const ref = ids(stageAt(sceneAt(390, 844, 0, 1)));
    expect(new Set(ref).size, "unique").toBe(ref.length);
    for (const lvl of LEVELS) expect(ids(stageAt(sceneAt(390, 844, lvl, 2))), `level ${lvl}`).toEqual(ref);
    expect(Object.keys(LAYERS).length).toBeGreaterThan(10);
  });

  it.each(VIEWS)("%ix%i at zoom %s: every anchor in view has its room on screen, clear of the column, the moon, the HUD and the edges", async (W, H, z) => {
    let checked = 0;
    for (const lvl of LEVELS) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      for (const t of MOMENTS) {
        const s = sceneAt(W, H, lvl, t, z);
        const st = stageAt(s);
        const col = column(s);
        const m = { ...moonAt(s) };
        const R = m.r * HALO_REACH;
        // Where the Horseman's hill covers the moon's lower face, the disc is hidden: things in front
        // of the hill there are not on the moon.
        const hill = mask(s.cssW, s.cssH, (ctx) => hillOnly(ctx, s), 128);
        const hidden = (x: number, y: number) => {
          const px = Math.round(x);
          const py = Math.round(y);
          return px >= 0 && py >= 0 && px < Math.round(s.cssW) && py < Math.round(s.cssH) && hill[py * Math.round(s.cssW) + px] === 1;
        };
        each(st, (name, a) => {
          if (!a.vis) return;
          const b = room(name, a, s);
          const at = `level ${lvl}, t=${t}: ${name} ${a.id}`;
          checked++;
          expect(b.x0 >= 1 && b.x1 <= s.cssW - 1 && b.y0 >= 1 && b.y1 <= s.cssH - 1, `${at}: off screen ${JSON.stringify(b)}`).toBe(true);
          // The railing's run and the churchyard's stones are below the floor line; the rest keeps out of the column.
          const inColumn = b.x1 > col.x0 && b.x0 < col.x1 && b.y0 < col.floor;
          expect(inColumn, `${at}: in the tower's column ${JSON.stringify(b)}`).toBe(false);
          // Free sky keeps clear of the moon's halo; the rest (a window, a branch, a stone) of its disc.
          const cx = Math.max(b.x0, Math.min(m.x, b.x1));
          const cy = Math.max(b.y0, Math.min(m.y, b.y1));
          const keep = name === "lanes" || name === "deep" ? R : m.r * 1.1;
          if (!hidden(cx, cy)) expect(Math.hypot(cx - m.x, cy - m.y), `${at}: on the moon (or the free sky in its halo)`).toBeGreaterThanOrEqual(keep - 0.5);
          if (name !== "deep") expect(b.y0, `${at}: in the HUD`).toBeGreaterThanOrEqual(s.cssH * 0.2);
        });
      }
    }
    expect(checked, "anchors checked").toBeGreaterThan(LEVELS.length * 4);
  }, 120_000);

  it.each(SCREENS)("%ix%i: anchors sit on something drawn: a perch on its chimney, a window behind its pane", async (W, H) => {
    let checked = 0;
    for (const lvl of LEVELS) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      const s = sceneAt(W, H, lvl, 3.3);
      const st = stageAt(s);
      const all = context(W, H);
      kitFor(halloween).world(all, s);
      kitFor(halloween).front(all, s);
      const sky = context(W, H);
      skyBack(sky, s);
      const A = all.getImageData(0, 0, W, H).data;
      const B = sky.getImageData(0, 0, W, H).data;
      /** Whether scenery (not the sky) is drawn near (x, y), within r px. */
      const drawn = (x: number, y: number, r: number) => {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const px = Math.round(x + dx);
            const py = Math.round(y + dy);
            if (px < 0 || py < 0 || px >= W || py >= H) continue;
            const i = (py * W + px) * 4;
            if (Math.abs(A[i]! - B[i]!) + Math.abs(A[i + 1]! - B[i + 1]!) + Math.abs(A[i + 2]! - B[i + 2]!) > 12) return true;
          }
        }
        return false;
      };
      const at = (what: string, id: number) => `level ${lvl}: ${what} ${id}`;
      for (const name of ["chimneys", "stones", "roosts", "boughs"] as const) {
        const p = st[name];
        for (let i = 0; i < p.n; i++) {
          const a = p.items[i] as Perch;
          // (A faint one, fading in or out, can't be told from the sky.)
          if (a.vis < 0.5) continue;
          checked++;
          expect(drawn(a.x, a.y + 2, 3), at(name, a.id)).toBe(true);
        }
      }
      for (let i = 0; i < st.eaves.n; i++) {
        const a = st.eaves.items[i] as Perch;
        if (a.vis < 0.5) continue;
        checked++;
        expect(drawn(a.x, a.y - 2, 3), at("eave", a.id)).toBe(true);
      }
      for (const name of ["ridges", "rails"] as const) {
        const p = st[name];
        for (let i = 0; i < p.n; i++) {
          const a = p.items[i] as Ridge;
          if (a.vis < 0.5) continue;
          checked++;
          expect(drawn((a.hx + a.ex) / 2, (a.hy + a.ey) / 2 + 2, 3), at(name, a.id)).toBe(true);
        }
      }
      for (let i = 0; i < st.panes.n; i++) {
        const a = st.panes.items[i] as Pane;
        if (a.vis < 0.5) continue;
        checked++;
        expect(drawn(a.x + a.w / 2, a.y + a.h / 2, 1), at("pane", a.id)).toBe(true);
      }
    }
    expect(checked, "anchors checked").toBeGreaterThan(40);
  }, 120_000);

  it.each(SCREENS)("%ix%i: each anchor lies on its own piece of scenery, drawn alone", async (W, H) => {
    // Stronger than the check above (anything but the sky behind it): each anchor's own piece is
    // drawn alone on a clear canvas, and the anchor must sit on it (a perch on its chimney's top, not
    // on the cathedral behind; a pane inside its window: warm if lit, dark if not, never the wall).
    const owners: [number[], (ctx: CanvasRenderingContext2D, s: Scene) => void][] = [
      [[101, 201, 301, 601, 602, 603, 701, 1001], (ctx, s) => (shops(ctx, s), shopsOver(ctx, s))],
      [[400, 401], (ctx, s) => churchyard(ctx, s)],
      [[302, 303, 501], (ctx, s) => front(ctx, s)],
      [[801, 901], (ctx, s) => mansion(ctx, s, toneOf(s).hill, true, toneOf(s).hollow, toneOf(s).swarm)],
      [[311, 312, 402, 403, 404, 405, 1011, 1012], (ctx, s) => cemetery(ctx, s)],
      [[111], (ctx, s) => nearSpire(ctx, s)],
      [[911], (ctx, s) => cathedral(ctx, s, toneOf(s))],
      [[112, 711], (ctx, s) => chimneyStack(ctx, s)],
      [[113, 211, 321, 611, 612, 712, 1021], (ctx, s) => roofs(ctx, s)],
      [[121, 122, 322, 323, 921], (ctx, s) => bellTower(ctx, s)],
      [[141, 142, 143, 144, 341, 641, 741, 941, 1051], (ctx, s) => drowned(ctx, s, toneOf(s))],
      [[131, 132, 133, 231, 331, 332, 406, 407, 631, 632, 633, 731, 831, 931, 1041, 1042], (ctx, s) => (isles(ctx, s, -1), isles(ctx, s, 1))],
    ];
    let checked = 0;
    for (const lvl of LEVELS) {
      await breathe(); // let the pixel reads be freed now and then (see breathe)
      const s = sceneAt(W, H, lvl, 3.3);
      // The point each anchor needs underneath it (and how near, px), by id.
      const probes = new Map<number, [number, number, number]>();
      /** Panes: whether lit (their window glows warm) or dark. */
      const lit = new Map<number, boolean>();
      each(stageAt(s), (name, a) => {
        if (name === "panes" && a.vis! >= 0.5) lit.set(a.id!, a.lit === 1);
        if (a.vis! < 0.5) return;
        if (name === "chimneys" || name === "stones" || name === "roosts" || name === "boughs") probes.set(a.id!, [a.x!, a.y! + 2, 3]);
        else if (name === "eaves") probes.set(a.id!, [a.x!, a.y! - 2, 3]);
        else if (name === "ridges" || name === "rails") probes.set(a.id!, [(a.hx! + a.ex!) / 2, (a.hy! + a.ey!) / 2 + 2, 3]);
        else if (name === "panes") probes.set(a.id!, [a.x! + a.w! / 2, a.y! + a.h! / 2, 1]);
        else if (name === "hideouts") probes.set(a.id!, [(a.x0! + a.x1!) / 2, a.rimY! + 2, 3]);
        else if (name === "roads") probes.set(a.id!, [0.25 * a.x0! + 0.5 * a.xm! + 0.25 * a.x1!, 0.25 * a.y0! + 0.5 * a.ym! + 0.25 * a.y1! + 2, 3]);
      });
      for (const [ids, draw] of owners) {
        const mine = ids.filter((id) => probes.has(id));
        if (mine.length === 0) continue;
        const ctx = context(W, H);
        draw(ctx, s);
        const px = ctx.getImageData(0, 0, W, H).data;
        for (const id of mine) {
          const [x, y, r] = probes.get(id)!;
          let on = false;
          for (let dy = -r; dy <= r && !on; dy++) {
            for (let dx = -r; dx <= r && !on; dx++) {
              const qx = Math.round(x + dx);
              const qy = Math.round(y + dy);
              if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
              const i = (qy * W + qx) * 4;
              if (px[i + 3]! <= 24) continue;
              // A pane is a window: a lit one glows warm, a dark one is dark (not the wall round it).
              const pane = lit.get(id);
              if (pane === undefined) on = true;
              else if (pane) on = px[i]! > 150 && px[i]! > px[i + 2]! + 30;
              else on = px[i]! * 0.3 + px[i + 1]! * 0.59 + px[i + 2]! * 0.11 < 60;
            }
          }
          checked++;
          expect(on, `level ${lvl}: anchor ${id} at (${x.toFixed(1)}, ${y.toFixed(1)}) is on its own piece`).toBe(true);
          probes.delete(id);
        }
      }
      // Every anchor in view but the free sky's was checked against its owner.
      expect([...probes.keys()], `level ${lvl}: anchors with no owner to check`).toEqual([]);
    }
    expect(checked, "anchors checked").toBeGreaterThan(60);
  }, 120_000);

  it("each stretch has the anchors its cast needs", () => {
    const seen = (from: number, to: number, names: string[]) => {
      const out = new Set<string>();
      for (let lvl = from; lvl <= to; lvl += 1) {
        for (const t of [1, 5]) {
          stageAt(sceneAt(390, 844, lvl, t));
          for (const n of names) if (ANCHORS[n]!.vis > 0) out.add(n);
        }
      }
      return [...out].sort();
    };
    const need = (from: number, to: number, names: string[]) => expect(seen(from, to, names), `levels ${from}-${to}`).toEqual([...names].sort());
    // A, Main Street: the curio's chimney, ridge, belvedere and dormer; the sweet shop's eave, gable and vent;
    // the ghost stones, the railing and its webs, the cage, the belfry, the crag road.
    need(0, 10, ["curioChimney", "curioRidge", "belvedere", "curioDormer", "sweetEave", "sweetGable", "sweetVent", "cross", "slab", "rail", "railWebL", "railWebR", "cageBird", "belfry", "cragRoad"]);
    // B, over the rooftops: the hill cemetery's stones and trees, the belfry; the curio's chimney still early on.
    need(14, 30, ["hill0", "hill1", "hill2", "hill3", "hillBoughL", "hillBoughR", "hillTreeL", "belfry", "curioChimney", "laneL", "laneR"]);
    // C, the skyline (the cathedral, then the near spire; the crooked roofs, then the chimney stack): the roofs' ridge, windows, chimney, gargoyle, cage, hideout; the spire's vane; the chimney stack; the cathedral's spire.
    need(36, 66, ["roofsRidge", "roofsWindow", "roofsAttic", "roofsChimney", "roofsGargoyle", "roofsCage", "roofsHide", "spireVane", "stackPot", "stackHide", "cathedralSpire", "laneL", "laneR"]);
    // D, the storm: the bell tower's roost, gargoyles and webs; the lighthouse's rail; the deep sky.
    need(60, 92, ["bellRoost", "bellGargoyleL", "bellGargoyleR", "bellWebL", "bellWebR", "lightRail", "deepR", "laneL"]);
    // The drowned hollow: the chapel's cross, belfry and web on the first pass; the lantern oak's fork and bough as it ends.
    need(26, 50, ["chapelCross", "chapelBelfry", "chapelWeb", "chapelLancet"]);
    need(100, 124, ["oakFork", "oakBough"]);
    // The loop: the isles' cottage, graveyard, door, hanging house, bridge and castle; the belfry; the free and deep sky.
    need(LOOP_START, LOOP_START + LOOP_PERIOD, [
      "cottageRidge",
      "cottageWindow",
      "cottageTree",
      "cottageTip",
      "cottageHide",
      "gravesTree",
      "gravesTip",
      "isleStone0",
      "isleStone1",
      "skyDoor",
      "hangingWindow",
      "loopBridge",
      "castleRoost",
      "belfry",
      "laneL",
      "laneR",
      "deepR",
      "deepL",
      "shipMast",
      "shipNest",
      "chapelCross",
      "chapelBelfry",
      "lightRail",
      "oakFork",
      "oakBough",
    ]);
  }, 60_000);

  it("slots are drawn back to front: the cast's anchors use the scenery's slots", () => {
    const slots = new Set(Object.values(SLOT));
    each(stageAt(sceneAt(390, 844, 0, 1)), (name, a) => expect(slots.has(a.slot as never), `${name} ${a.id}`).toBe(true));
    // A stone's slot index is its stone's number; lane boxes are free sky.
    stageAt(sceneAt(390, 844, 130, 1));
    expect((ANCHORS.cross as Perch).index).toBe(0);
    expect((ANCHORS.slab as Perch).index).toBe(1);
    // (Free sky among the near things; low over the mist's sea it is drawn after the mist.)
    let low = 0;
    for (let lvl = 30; lvl <= 240; lvl += 5) {
      const sc = sceneAt(390, 844, lvl, 1);
      stageAt(sc);
      const top = mistTop(sc);
      for (const b of [ANCHORS.laneL, ANCHORS.laneR] as LaneBox[]) {
        if (!b.vis) continue;
        if (b.slot === SLOT.near) expect(b.y1, `level ${lvl}: lane ${b.id}, drawn before the mist, reaches into it`).toBeLessThanOrEqual(top);
        else {
          expect(b.slot, `level ${lvl}: lane ${b.id}`).toBe(SLOT.mist);
          expect(b.y1, `level ${lvl}: lane ${b.id}, drawn after the mist, lies over it`).toBeGreaterThan(top);
          low++;
        }
      }
    }
    expect(low, "ghosts drift low over the mist's sea now and then").toBeGreaterThan(3);
  });
});
