import { horizonFor } from "../../base/world";
import { BASE_WIDTH, BLOCK_HEIGHT, WORLD_WIDTH } from "../../config";
import type { Scene } from "../skin";

// Hand-built scenes for the New Year's tests, with render.ts's camera (a view 1.5 playfields
// wide, the tower's top at 38% down, the ground held at 70% until the tower outgrows it).

/**
 * The scene on a W x H screen with the camera at tower level `lvl`. `u` defaults to the
 * screen's own; Hard's zoomed-out camera passes the phone's u with a bigger virtual screen.
 */
export function sceneAt(W: number, H: number, lvl: number, t: number, songTime = NaN, u = Math.min(W, H * 0.6)): Scene {
  const scale = u / (WORLD_WIDTH * 1.5);
  const offsetX = (W - WORLD_WIDTH * scale) / 2;
  const cameraY = Math.max((lvl + 1) * BLOCK_HEIGHT, ((0.7 - 0.38) * H) / scale);
  const groundY = H * 0.38 + cameraY * scale;
  const rise = Math.max(0, groundY - H * 0.7);
  return {
    cssW: W,
    cssH: H,
    u,
    scale,
    t,
    rise,
    altitude: cameraY,
    groundY,
    horizonY: horizonFor(groundY, rise, u),
    baseX: offsetX + ((WORLD_WIDTH - BASE_WIDTH) / 2) * scale,
    baseW: BASE_WIDTH * scale,
    songTime,
  };
}
