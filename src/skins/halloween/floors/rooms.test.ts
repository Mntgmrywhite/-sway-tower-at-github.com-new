import { describe, expect, it } from "vitest";
import { CANDLES, CAT, CHAIR, CLOCK, CURTAIN, GHOST, JACK, kindOf, LAB, PORTRAIT, SKELETON, WITCH, BOOK } from "./palette";
import { doorOpen, driftAt, jackFace, jigAt, passAt, portraitEyes, rockAt, sparkAt } from "./rooms";
import { BASE_W, H_PHONE, H_TABLET, info, shoot, type Shot } from "./test-floor";
import { LAY, ROOM_H, ROOM_TOP } from "./windows";

// The rooms: every floor's lit room plays its little scene on its own clock. Each one shows itself
// within a tower's first 10 seconds and comes round again for as long as anyone watches; the
// rocking chair rests a good while between spells; floors twelve apart (the same room) never move
// together; and a room's look at a moment depends on nothing but that moment.

const LEVELS = Array.from({ length: 240 }, (_, i) => i + 1);
/** The base bar on a tablet, where a pixel is a finer measure of a small motion. */
const TW = (BASE_W * H_TABLET) / H_PHONE;

/** The moments (step 0.05 s, up to `until`) at which a stream's events start. */
function starts(active: (t: number) => boolean, until: number): number[] {
  const out: number[] = [];
  let was = active(0);
  if (was) out.push(0);
  for (let t = 0.05; t <= until; t += 0.05) {
    const is = active(t);
    if (is && !was) out.push(t);
    was = is;
  }
  return out;
}

const STREAMS: Record<number, (level: number, t: number) => boolean> = {
  [SKELETON]: (l, t) => jigAt(l, t) >= 0,
  [CHAIR]: (l, t) => rockAt(l, t) >= 0,
  // The figure behind the curtains, paused in the middle with its gesture
  [CURTAIN]: (l, t) => {
    const p = passAt(l, t);
    return p >= 0.95 && p < 1.55;
  },
  [GHOST]: (l, t) => driftAt(l, t) >= 0,
  [LAB]: (l, t) => sparkAt(l, t) >= 0,
  [JACK]: (l, t) => jackFace(l, t).blink,
  [PORTRAIT]: (l, t) => portraitEyes(l, t).blink,
};

/** The room's window on a floor just painted (LAY holds its layout). */
function roomOf(s: Shot): { x0: number; x1: number; y0: number; y1: number } {
  return { x0: Math.floor(LAY.rx), x1: Math.ceil(LAY.rx + LAY.rw), y0: Math.floor(s.y + ROOM_TOP * s.h), y1: Math.ceil(s.y + (ROOM_TOP + ROOM_H) * s.h) };
}

/** Pixels that differ between two rooms (each in its own window, aligned at its left edge). */
function roomDiff(a: Shot, ra: ReturnType<typeof roomOf>, b: Shot, rb: ReturnType<typeof roomOf>): number {
  let n = 0;
  for (let y = 0; y < ra.y1 - ra.y0; y++) {
    for (let x = 0; x < Math.min(ra.x1 - ra.x0, rb.x1 - rb.x0); x++) {
      const i = ((ra.y0 + y) * a.W + ra.x0 + x) * 4;
      const j = ((rb.y0 + y) * b.W + rb.x0 + x) * 4;
      if (Math.abs(a.data[i]! - b.data[j]!) + Math.abs(a.data[i + 1]! - b.data[j + 1]!) + Math.abs(a.data[i + 2]! - b.data[j + 2]!) > 30) n++;
    }
  }
  return n;
}

function copy(s: Shot): Shot {
  return { ...s, data: new Uint8ClampedArray(s.data) };
}

describe("the rooms", () => {
  it("each shows its key moment within a tower's first 10 s, then keeps coming round", () => {
    for (const level of LEVELS) {
      const room = kindOf(level).room;
      const stream = STREAMS[room];
      if (!stream) continue;
      const s = starts((t) => stream(level, t), 600);
      expect(s.length, `room ${room} on level ${level}`).toBeGreaterThan(0);
      expect(s[0]!, `room ${room} on level ${level}: first at ${s[0]}`).toBeLessThanOrEqual(10);
      // And again and again: no gap longer than half a minute
      for (let i = 1; i < s.length; i++) expect(s[i]! - s[i - 1]!, `room ${room} on level ${level} after ${s[i - 1]}`).toBeLessThanOrEqual(30);
      expect(600 - s[s.length - 1]!).toBeLessThanOrEqual(30);
    }
    // The front door opens a crack by 10 s, and again every 8–15 s.
    const door = starts((t) => doorOpen(0, t) > 0, 600);
    expect(door[0]!).toBeLessThanOrEqual(10);
    for (let i = 1; i < door.length; i++) expect(door[i]! - door[i - 1]!).toBeGreaterThanOrEqual(7.9);
    for (let i = 1; i < door.length; i++) expect(door[i]! - door[i - 1]!).toBeLessThanOrEqual(15.1);
  });

  it("every room, the door too, moves within 10 s (as painted)", () => {
    for (let level = 0; level <= 24; level++) {
      const first = copy(shoot(level, TW, H_TABLET, info(0)));
      const r0 = roomOf(first);
      let most = 0;
      for (let t = 0.1; t <= 10 && most < 8; t += 0.1) {
        const s = shoot(level, TW, H_TABLET, info(t));
        most = Math.max(most, roomDiff(first, r0, s, roomOf(s)));
      }
      expect(most, `level ${level} (room ${kindOf(level).room})`).toBeGreaterThanOrEqual(8);
    }
  });

  it("the rocking chair rests at least 5 s at a time, at least once a minute", () => {
    for (const level of LEVELS.filter((l) => kindOf(l).room === CHAIR)) {
      // Still stretches (start, end) over ten minutes
      const still: [number, number][] = [];
      let from = rockAt(level, 0) >= 0 ? -1 : 0;
      for (let t = 0.05; t <= 660; t += 0.05) {
        const rocking = rockAt(level, t) >= 0;
        if (rocking && from >= 0) {
          still.push([from, t]);
          from = -1;
        } else if (!rocking && from < 0) from = t;
      }
      for (let a = 0; a <= 600; a += 5) {
        const ok = still.some(([s, e]) => Math.min(e, a + 60) - Math.max(s, a) >= 5);
        expect(ok, `level ${level}: no rest of 5 s between ${a} and ${a + 60} s`).toBe(true);
      }
    }
  });

  it("floors twelve apart never move together", () => {
    // As painted: the same room twelve floors up looks different at most moments...
    for (let level = 1; level <= 12; level++) {
      let differ = 0;
      const N = 60;
      for (let k = 0; k < N; k++) {
        const t = 0.3 + k * 2.37;
        const a = copy(shoot(level, BASE_W, H_PHONE, info(t)));
        const ra = roomOf(a);
        const b = shoot(level + 12, BASE_W, H_PHONE, info(t));
        if (roomDiff(a, ra, b, roomOf(b)) > 30) differ++;
      }
      expect(differ / N, `level ${level} and ${level + 12}`).toBeGreaterThanOrEqual(0.7);
    }
    // ...and their timetables don't run in step: few of one's events start with the other's.
    for (const level of LEVELS.slice(0, 120)) {
      const stream = STREAMS[kindOf(level).room];
      if (!stream) continue;
      const a = starts((t) => stream(level, t), 300);
      const b = starts((t) => stream(level + 12, t), 300);
      const together = a.filter((s) => b.some((u) => Math.abs(u - s) < 0.3)).length;
      expect(together / a.length, `level ${level} and ${level + 12}`).toBeLessThanOrEqual(0.25);
    }
  });

  it("depend on nothing but the moment (pure in any order)", () => {
    const times = [0.2, 3.3, 7.9, 1.1, 12.6, 5.5, 40.2, 2.4];
    const shuffled = [...times].reverse();
    for (let level = 0; level <= 24; level++) {
      const first = new Map<number, Uint8ClampedArray>();
      for (const t of times) first.set(t, new Uint8ClampedArray(shoot(level, BASE_W, H_PHONE, info(t)).data));
      for (const t of shuffled) expect(Buffer.compare(Buffer.from(shoot(level, BASE_W, H_PHONE, info(t)).data), Buffer.from(first.get(t)!)), `level ${level} at ${t}`).toBe(0);
    }
  });

  it("the restless rooms never stop", () => {
    // The witch stirs, the book bobs, the coil's flask fizzes, the clock ticks, the candles flicker
    // and the cat's tail swishes in every second.
    for (const room of [WITCH, BOOK, LAB, CLOCK, CANDLES, CAT]) {
      const level = 12 + room;
      for (let t = 0; t < 30; t += 1.7) {
        const a = copy(shoot(level, TW, H_TABLET, info(t)));
        const ra = roomOf(a);
        let most = 0;
        for (let d = 0.2; d <= 1 && most < 4; d += 0.2) {
          const b = shoot(level, TW, H_TABLET, info(t + d));
          most = Math.max(most, roomDiff(a, ra, b, roomOf(b)));
        }
        expect(most, `room ${room} at ${t.toFixed(1)} s`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
