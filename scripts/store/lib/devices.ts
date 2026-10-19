// Apple's App Store Connect sizes (developer.apple.com/help/app-store-connect/reference/
// screenshot-specifications and .../app-preview-specifications, checked 2026-10-18).
//
// Screenshots: up to 10 per display size, JPEG or PNG, no alpha. Required: at least one for
// "iPhone with Dynamic Island (medium display)" (6.1"/6.3": 1206 x 2622 or 1179 x 2556) and,
// since the app runs on iPad, one for the 13" iPad (2064 x 2752 or 2048 x 2732). The large
// Dynamic Island display (6.9"/6.7": 1320 x 2868) and the 6.5" Face ID display (1284 x 2778)
// are optional; sizes not uploaded are scaled from the nearest. All four are rendered here, so
// nothing is scaled.
//
// App previews: up to three per display size, 15–30 s, H.264 up to High Profile Level 4.0 at
// 30 fps, 10–12 Mbps, stereo AAC 256 kbps at 44.1/48 kHz, 886 x 1920 portrait for every
// Face ID / Dynamic Island iPhone and 1200 x 1600 portrait for the 13" iPad.

export interface Device {
  /** Folder name under store/out. */
  id: string;
  /** App Store Connect's name for the display size. */
  name: string;
  /** Pixel size of the file. */
  w: number;
  h: number;
  /** Device pixels per CSS pixel: the game is rendered at w/scale x h/scale CSS px, like on the device. */
  scale: number;
  kind: "iphone" | "ipad";
  required: boolean;
}

/** CSS size the game is laid out at for a device. */
export function cssSize(d: Device): { cssW: number; cssH: number } {
  return { cssW: d.w / d.scale, cssH: d.h / d.scale };
}

export const SCREENSHOT_DEVICES: readonly Device[] = [
  { id: "iphone-6.9", name: 'iPhone 6.9" / 6.7" — iPhone with Dynamic Island (large display)', w: 1320, h: 2868, scale: 3, kind: "iphone", required: false },
  { id: "iphone-6.1", name: 'iPhone 6.3" / 6.1" — iPhone with Dynamic Island (medium display)', w: 1206, h: 2622, scale: 3, kind: "iphone", required: true },
  { id: "iphone-6.5", name: 'iPhone 6.5" — iPhone with Face ID (large display)', w: 1284, h: 2778, scale: 3, kind: "iphone", required: false },
  { id: "ipad-13", name: 'iPad 13" (also used for 12.9" and 11")', w: 2064, h: 2752, scale: 2, kind: "ipad", required: true },
];

export const PREVIEW_DEVICES: readonly Device[] = [
  { id: "iphone", name: 'iPhone 6.9" / 6.7" / 6.5" / 6.3" / 6.1" / 5.8" app preview', w: 886, h: 1920, scale: 2, kind: "iphone", required: false },
  { id: "ipad-13", name: 'iPad 13" / 12.9" / 11" app preview', w: 1200, h: 1600, scale: 2, kind: "ipad", required: false },
];

/** The preview's frame rate (Apple's maximum) and length, seconds (Apple: 15–30). */
export const PREVIEW_FPS = 30;
