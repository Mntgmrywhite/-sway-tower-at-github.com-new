import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";
import { kitFor } from "./base/style";
import { frameFor } from "./camera";
import { BLOCK_HEIGHT } from "./config";
import { newGame } from "./game";
import { shots, type Shot } from "./preview/shots";
import { newView, render } from "./render";
import {
  SHARE_H,
  SHARE_LINK,
  SHARE_TOP,
  SHARE_W,
  SLIDER_AWAY,
  WORLD_NAMES,
  bars,
  drawShareCard,
  pngBase64,
  pngFile,
  shareBand,
  shareLines,
  shareState,
  shareText,
  shareView,
  webShareAvailable,
  worldName,
  type ShareNavigator,
} from "./share";
import { classic } from "./skins/classic";
import type { Skin } from "./skins/skin";
import { neon } from "./skins/neon";
import { neonCyber } from "./skins/neon-cyber";
import { toyBlock } from "./skins/toyblock";
import { SKINS } from "./skins";

describe("the words", () => {
  it("counts bars", () => {
    expect(bars(1)).toBe("1 bar");
    expect(bars(24)).toBe("24 bars");
    expect(bars(0)).toBe("0 bars");
  });

  it("says what was stacked, in which mode, and asks for better", () => {
    expect(shareText(24, "hard", "")).toBe("I stacked 24 bars in Sway Tower (Drop) — can you beat it?");
    expect(shareText(1, "normal", "")).toBe("I stacked 1 bar in Sway Tower (Slide) — can you beat it?");
    expect(shareText(24, "normal", "https://example.com/sway")).toBe("I stacked 24 bars in Sway Tower (Slide) — can you beat it? https://example.com/sway");
    // The link is a placeholder until the app has a page; the default text carries it when set.
    expect(typeof SHARE_LINK).toBe("string");
    expect(shareText(5, "hard")).toBe(SHARE_LINK ? `I stacked 5 bars in Sway Tower (Drop) — can you beat it? ${SHARE_LINK}` : "I stacked 5 bars in Sway Tower (Drop) — can you beat it?");
  });

  it("the band's lines: the headline, the name, the mode and the world", () => {
    expect(shareLines(24, "hard", classic)).toEqual({ headline: "I stacked 24", name: "in Sway Tower", detail: "Drop · Sky Islands" });
    expect(shareLines(3, "normal", neon)).toEqual({ headline: "I stacked 3", name: "in Sway Tower", detail: "Slide · Synthwave" });
  });

  it("names each world as the store listing does, every other skin by its name", () => {
    expect(worldName(classic)).toBe("Sky Islands");
    expect(worldName(neon)).toBe("Synthwave");
    expect(worldName(neonCyber)).toBe("Cyberpunk");
    expect(worldName(toyBlock)).toBe("Toy Kingdom");
    // Every renamed world is a real skin.
    for (const id of Object.keys(WORLD_NAMES)) expect(SKINS.some((s) => s.id === id)).toBe(true);
  });
});

describe("the tower as it stood", () => {
  const over = (): Shot => shots().find((s) => s.name === "over")!;

  it("is the same tower, drawn as a run with no slider and nothing falling", () => {
    const shot = over();
    expect(shot.state.phase).toBe("over");
    const s = shareState(shot.state);
    expect(s.phase).toBe("playing");
    expect(s.blocks).toBe(shot.state.blocks);
    expect(s.score).toBe(shot.state.score);
    expect(s.fall).toBeNull();
    expect(s.slider.x).toBe(SLIDER_AWAY);
    // The real state is untouched.
    expect(shot.state.phase).toBe("over");
    const v = shareView(shot.view, shot.state);
    expect(v.t).toBe(shot.view.t);
    // Framed for the card: the tower's top just under the HUD, at SHARE_TOP of the height.
    const frame = frameFor(SHARE_W, SHARE_H, v.cameraY);
    const topY = frame.anchorPx - (shot.state.blocks.length * BLOCK_HEIGHT - frame.cameraY) * frame.scale;
    expect(topY / SHARE_H).toBeCloseTo(SHARE_TOP, 6);
    expect(v.topple).toBeNull();
    expect(v.falling).toEqual([]);
    expect(v.flashes).toEqual([]);
    expect(v.pops).toEqual([]);
  });

  /** Draw the card and collect what it drew: the words, and the bars handed to the style kit. */
  function drawn(shot: Shot, skin: Skin = classic) {
    const spy = vi.spyOn(kitFor(skin), "bar");
    const canvas = createCanvas(SHARE_W, SHARE_H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const words: string[] = [];
    const fill = ctx.fillText.bind(ctx);
    ctx.fillText = (t: string, x: number, y: number) => {
      words.push(t);
      fill(t, x, y);
    };
    try {
      drawShareCard(ctx, shot.state, shot.view, shot.best, skin, NaN);
      return { words, bars: spy.mock.calls.map(([, x, , , , level]) => ({ x, level })), canvas };
    } finally {
      spy.mockRestore();
    }
  }

  it("renders at 1080×1920 with the HUD score and the footer's three lines, and no game-over card or slider", () => {
    const shot = over();
    const { words, bars, canvas } = drawn(shot);
    expect([canvas.width, canvas.height]).toEqual([1080, 1920]);
    expect(words).toContain(String(shot.state.score));
    expect(words).toContain(`best ${shot.best}`);
    // The band's display lines go a word at a time (spaced so a narrow face still reads).
    expect(words.join(" ")).toContain(`I stacked ${shot.state.score} in Sway Tower Slide · Sky Islands`);
    expect(words).not.toContain("Game Over");
    expect(words).not.toContain("tap to play again");
    expect(words).not.toContain("tap to drop");
    // Every standing bar is drawn where the tower is; the slider's bar is off the card.
    expect(bars.filter((b) => b.level < shot.state.blocks.length).length).toBeGreaterThan(8);
    const topBar = bars.filter((b) => b.level === shot.state.blocks.length - 1);
    expect(topBar).toHaveLength(1);
    expect(topBar[0]!.x).toBeGreaterThan(0);
    expect(topBar[0]!.x).toBeLessThan(SHARE_W);
    for (const b of bars.filter((b) => b.level === shot.state.blocks.length)) expect(b.x).toBeGreaterThan(SHARE_W);
  });

  it("names Drop and the skin on a Drop run", () => {
    const shot = shots().find((s) => s.name === "hardBlast")!;
    expect(shot.state.mode).toBe("hard");
    const { words } = drawn(shot, neon);
    expect(words.join(" ")).toContain(`I stacked ${shot.state.score} in Sway Tower Drop · Synthwave`);
  });

  it("paints the band over the foot of the picture, inside the card", () => {
    const shot = over();
    const u = Math.min(SHARE_W, SHARE_H * 0.6);
    const band = shareBand(SHARE_W, SHARE_H, u);
    expect(band.x).toBeGreaterThan(0);
    expect(band.x + band.w).toBeLessThan(SHARE_W);
    expect(band.y + band.h).toBeLessThan(SHARE_H);
    expect(band.y).toBeGreaterThan(SHARE_H * 0.6);
    // The band's pixels differ from the plain frame's; the frame above it is the same tower.
    const plain = createCanvas(SHARE_W, SHARE_H);
    const pctx = plain.getContext("2d") as unknown as CanvasRenderingContext2D;
    render(pctx, SHARE_W, SHARE_H, shareState(shot.state), shareView(shot.view, shot.state), shot.best, classic, NaN);
    const { canvas } = drawn(shot);
    const ctx = canvas.getContext("2d");
    const row = (c: CanvasRenderingContext2D, y: number) => Buffer.from(c.getImageData(0, y, SHARE_W, 1).data);
    const mid = Math.round(band.y + band.h / 2);
    expect(row(ctx as unknown as CanvasRenderingContext2D, mid).equals(row(pctx, mid))).toBe(false);
    const above = Math.round(band.y - u * 0.1);
    expect(row(ctx as unknown as CanvasRenderingContext2D, above).equals(row(pctx, above))).toBe(true);
  });

  it.each(SKINS.map((s) => [s.id, s] as const))("%s draws the card without errors", (_, skin) => {
    const shot = over();
    const ctx = createCanvas(SHARE_W, SHARE_H).getContext("2d") as unknown as CanvasRenderingContext2D;
    drawShareCard(ctx, shot.state, shot.view, 52, skin, 12);
    // And a fresh, empty game (a zero: the button is hidden for it, but the card must not throw).
    drawShareCard(ctx, newGame(), newView(), 0, skin);
  });
});

describe("the picture's bytes", () => {
  it("takes the base64 out of a data URL and makes a PNG file of it, byte for byte", async () => {
    const canvas = createCanvas(8, 8);
    const url = canvas.toDataURL("image/png");
    const b64 = pngBase64(url);
    expect(b64.startsWith("iVBOR")).toBe(true);
    const file = pngFile(b64);
    expect(file.name).toBe("sway-tower.png");
    expect(file.type).toBe("image/png");
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect(Buffer.from(bytes).equals(Buffer.from(b64, "base64"))).toBe(true);
  });
});

describe("the web share", () => {
  const file = (nav: Partial<ShareNavigator>): ShareNavigator => nav;

  it("needs the Web Share API with files; anything else hides the button", () => {
    expect(webShareAvailable(undefined)).toBe(false);
    expect(webShareAvailable(file({}))).toBe(false);
    expect(webShareAvailable(file({ share: async () => {} }))).toBe(false);
    expect(webShareAvailable(file({ share: async () => {}, canShare: () => false }))).toBe(false);
    expect(webShareAvailable(file({ share: async () => {}, canShare: (d) => Array.isArray(d.files) && d.files.length === 1 }))).toBe(true);
    expect(
      webShareAvailable(
        file({
          share: async () => {},
          canShare: () => {
            throw new TypeError("no");
          },
        }),
      ),
    ).toBe(false);
  });

  it("stays hidden in a frame whose permissions policy does not allow sharing", () => {
    const nav = file({ share: async () => {}, canShare: () => true });
    expect(webShareAvailable(nav, { featurePolicy: { allowsFeature: (f) => f !== "web-share" } })).toBe(false);
    expect(webShareAvailable(nav, { featurePolicy: { allowsFeature: () => true } })).toBe(true);
    // Browsers that don't show the policy (Safari) go by canShare alone.
    expect(webShareAvailable(nav, {})).toBe(true);
  });
});
