import { alpha, mix } from "../../base/draw";
import { BLOCK_HEIGHT } from "../../config";
import type { Scene } from "../skin";
import { AWNING, AWNING_CREAM, BALCONY, BASILICA, BASILICA_SHADE, BRONZE, CANAL, CANAL_LIT, CONTOUR, COPPER, FAR_HILL, FLOOD_BRONZE, FLOOD_COPPER, FLOOD_GILT, FLOOD_STONE, FLOOD_WHITE, GILT, GLASS, GLOW, GONDOLA, KERB, LIMESTONE, PAVEMENT, POT, QUAY, ROADWAY, ROSE_WOOD, ROSE_WOOD_LIT, SAGE_WOOD, SAGE_WOOD_LIT, TOWER_LAMP, TREE, TRUNK, WHEEL_HUB, WHEEL_IRON, ZINC } from "./colors";

// Height tells the story: the light changes with the camera's altitude, in tower levels, the way
// the hours change on a run of Art Nouveau panels. A golden afternoon over Paris, warm and rich
// (a cornflower sky warming through rose to a honey glow over the rooftops, honey limestone and
// blue-grey zinc, the distance lilac); up into the dreamier Rococo pastels of the climb: a rose-
// and-lavender dusk as the evening mist takes the far city, the cloud sea gathers below you and
// the sun sinks into it, and the windows, the string lights, the lattice tower's lamps and the
// stained glass come on; then a violet starry night with a crescent moon where the sun set,
// Paris lit far below (the lattice tower and the domes floodlit, the wheel's gondolas and the
// windows aglow) and fireworks of hearts going up. Past that the story loops for as long as you
// can climb: the night holds a while, a blush-and-mint dawn brings the sun back up out of the
// clouds and puts the lights out, and from the golden afternoon on the day runs exactly as the
// first one did (dusk, the lights, night) into the night again. Every color that changes with
// the light is precomputed here in half-level steps, so drawing never mixes colors per frame.
// What moves or fades with the light (the sun setting and rising, the moon and the stars) is
// worked out for the exact level instead (`skyLightAt`): a half-level step in the sun's path is a
// jump of a dozen pixels and more (the owner saw it "shift jarringly" as the clouds came up), so
// the sun glides down and up with the camera.

/** Where each stage peaks, in levels (camera altitude / BLOCK_HEIGHT). */
const AFTERNOON = 14;
const DUSK = 32;
const NIGHT = 60;
/** The cloud sea has covered the boulevard by here (far.ts). */
export const DAY_HIGH = 30;

/**
 * The loop: from LOOP_START on, the story repeats every LOOP levels. It starts in the settled
 * night; the night holds for NIGHT_HOLD levels, dawn breaks over the next DAWN_SPAN, and at the
 * golden afternoon the loop picks up the first day's story at AFTERNOON and runs it again, up to
 * the night it began in (the first day's tone at LOOP_START), so its end flows into its start.
 */
export const LOOP_START = 100;
const NIGHT_HOLD = 4;
const DAWN_SPAN = 30;
/** Where the loop rejoins the first day's story: loop offset DAWN_END is the first day's AFTERNOON. */
const DAWN_END = NIGHT_HOLD + DAWN_SPAN;
export const LOOP = DAWN_END + (LOOP_START - AFTERNOON);
/** The story level the loop begins at (its night hold), and the one the first day's story picks up at. */
export const LOOP_DAWN = AFTERNOON - DAWN_END;
export const DAY_FROM = AFTERNOON;

/**
 * The level of the first pass that tells the story at `lvl`: `lvl` itself below LOOP_START;
 * past it, in the loop, the matching level of the first day from its afternoon on, or (in the
 * night hold and the dawn, which the first pass has no match for) a level before AFTERNOON,
 * counting back from it. Periodic past LOOP_START with period LOOP.
 */
export function storyLevel(lvl: number): number {
  if (lvl < LOOP_START) return lvl;
  const x = (lvl - LOOP_START) % LOOP;
  return x < DAWN_END ? AFTERNOON - DAWN_END + x : AFTERNOON + x - DAWN_END;
}

/** Camera altitude in tower levels. */
export function level(s: Scene): number {
  return s.altitude / BLOCK_HEIGHT;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 below a, 1 above b, eased between. */
export function smooth(a: number, b: number, x: number): number {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}

/** The light at one stage. */
interface Key {
  at: number;
  /** Sky gradient: top, middle, the glow band low in the sky, and the bottom. */
  sky: [string, string, string, string];
  /** Clouds: shaded underside, body, lit caps. */
  cloud: [string, string, string];
  /** What distance fades toward. */
  haze: string;
  /** How far mid-distance things sink toward the night shadow (0 by day). */
  dark: number;
}

const NIGHT_SHADOW = "#1c1448";

/** The afternoon: a clear cornflower sky warming through rose to a honey-gold glow over the rooftops, the distance lilac. */
const GOLDEN: Omit<Key, "at"> = {
  sky: ["#7896e6", "#eaa6c2", "#ffbe72", "#ffd98f"],
  cloud: ["#dfa8bf", "#fbd8da", "#fff3e8"],
  haze: "#b9a6d6",
  dark: 0,
};

const NIGHT_KEY: Omit<Key, "at"> = {
  sky: ["#1b1449", "#2d1c6a", "#4a2a84", "#6c3a90"],
  cloud: ["#4a3180", "#7a54a8", "#a682c9"],
  haze: "#5b3c8c",
  dark: 0.58,
};

const KEYS: Key[] = [
  { at: 0, ...GOLDEN },
  { at: AFTERNOON, ...GOLDEN },
  {
    at: DUSK,
    sky: ["#5f4a9c", "#b878b2", "#f49aa0", "#ffcaa8"],
    cloud: ["#c07ca6", "#f9bccb", "#ffe8ec"],
    haze: "#e69cb3",
    dark: 0.28,
  },
  { at: NIGHT, ...NIGHT_KEY },
];

/**
 * The loop's dawn, in story levels (see storyLevel): the night, then a Rococo dawn (periwinkle
 * over lavender, a blush glow, the clouds lit blush with mint caps) as the sun comes up out of the
 * cloud sea, then the golden afternoon.
 */
const DAWN_FROM = AFTERNOON - DAWN_SPAN;
const DAWN_PEAK = AFTERNOON - DAWN_SPAN * 0.45;
const DAWN_KEYS: Key[] = [
  { at: DAWN_FROM, ...NIGHT_KEY },
  {
    at: DAWN_PEAK,
    sky: ["#6f78ba", "#b9a9d8", "#ffb4ac", "#ffe0c0"],
    cloud: ["#b98fb8", "#fbd4da", "#e4f4ea"],
    haze: "#e3b0c0",
    dark: 0.2,
  },
  { at: AFTERNOON, ...GOLDEN },
];

/** One row of the far city's colors in the light of the hour. */
export interface RowTone {
  stoneLit: string;
  stone: string;
  shade: string;
  zincLit: string;
  zinc: string;
  zincShade: string;
  glass: string;
  /** The glass behind the tower, a shade off the stone. */
  quietGlass: string;
  lit: string;
  pot: string;
  balcony: string;
}

/** Everything that changes with the light, at one altitude. */
export interface Tone {
  sky: [string, string, string, string];
  /** The cloud sea's and the drifting clouds' shaded rows, body and lit caps, and the fine line along their scallops. */
  cloudShade: string;
  cloud: string;
  cloudLight: string;
  cloudLine: string;
  /**
   * The frame down each side of the sky: its stained-glass panes (translucent over the sky), the
   * leading; the climbing rose's stem, its leaves, its roses (and their inner petals), the lily
   * buds, and the fine contour round them.
   */
  paneRose: string;
  paneMint: string;
  rule: string;
  vine: string;
  vineLeaf: string;
  bloom: string;
  bloomDeep: string;
  bud: string;
  vineLine: string;
  /**
   * The far city, row by row from the farthest, each faded toward the haze by its depth (far.ts):
   * its limestone (sunlit side, body, shade), its zinc roofs (lit slope, body, shade), the window
   * glass (blue by day) and the windows lit at dusk, the chimney pots and the iron balconies.
   */
  rows: RowTone[];
  /** The far hill on the horizon, and the white basilica on it (lit and shaded). */
  hillFar: string;
  basilica: string;
  basilicaShade: string;
  /** The gilded dome (lit, body, shade) and the stone of its drum (body and shade). */
  giltLit: string;
  gilt: string;
  giltShade: string;
  drum: string;
  drumShade: string;
  /** The lattice tower's bronze (lit edges, body, shade; floodlit gold at night) and its lamps, lit at dusk. */
  bronzeLit: string;
  bronze: string;
  bronzeShade: string;
  towerLamp: string;
  /**
   * Paris above the clouds (skyline.ts), floodlit warm at night: the domes' gilt (lit, body,
   * shade), the stone of their drums and fronts (lit, body, shade), the white basilica's stone
   * (body, shade), green copper (lit, body, shade) and the windows (blue by day, lit at night).
   */
  skyGiltLit: string;
  skyGilt: string;
  skyGiltShade: string;
  skyStoneLit: string;
  skyStone: string;
  skyStoneShade: string;
  skyWhite: string;
  skyWhiteShade: string;
  copperLit: string;
  copper: string;
  copperShade: string;
  skyWindow: string;
  /** The avenue: its roadway, and its round trees (lit, body, shade) on their trunks. */
  road: string;
  treeLit: string;
  tree: string;
  treeShade: string;
  trunk: string;
  /** The Ferris wheel's frame, its gondolas, and the bulbs along its spokes once lit. */
  wheel: string;
  gondola: string;
  wheelLit: string;
  /** The boulevard's paving (two tones). */
  pave: string;
  pave2: string;
  /** The canal and its lit ripples; the kissing bridge's stone, lit and shaded; the swans. */
  canal: string;
  canalLit: string;
  stone: string;
  stoneLit: string;
  stoneShade: string;
  swan: string;
  /**
   * The boulevard's Haussmann fronts (boulevard.ts): their limestone (sunlit, body, shade), the
   * zinc mansards (lit slope, body, shade), the window glass by day, the iron balconies, the
   * chimney pots, and the fine contour round them; the quiet front behind the tower, a shade off
   * its own stone (body, its ledges and window surrounds, its carved lines, its windows, its
   * contour).
   */
  houseLit: string;
  house: string;
  houseShade: string;
  zincLit: string;
  zinc: string;
  zincShade: string;
  windowGlass: string;
  balcony: string;
  pot: string;
  line: string;
  quiet: string;
  quietLit: string;
  quietLine: string;
  quietGlass: string;
  quietEdge: string;
  quietRoof: string;
  /** The shopfronts' painted woodwork: the chocolatier's rose (lit, body), the café's sage (lit, body); the awning's two stripes. */
  roseWoodLit: string;
  roseWood: string;
  sageWoodLit: string;
  sageWood: string;
  awning: string;
  awning2: string;
  /** Guimard's green ironwork far off: the stall's arch, the café's brackets, the lamp. */
  iron: string;
  /** Stained glass: rose, amber and mint panes (glowing once the lights are on) and the leading between them. */
  glassRose: string;
  glassAmber: string;
  glassMint: string;
  lead: string;
  /** The flower stall's canopy (two colors in gores), doors, windows lit at dusk, sign boards. */
  canopy: string;
  canopy2: string;
  door: string;
  windowLit: string;
  sign: string;
  /** The flower stall's roses and tulips and their leaves; the chocolate shop's bonbons. */
  rose: string;
  tulipY: string;
  tulipP: string;
  leaf: string;
  bonbon: string;
  bonbonPink: string;
  /** The couple at the café: skin, her dress and hair, his jacket and cap, the card, the chairs. */
  skin: string;
  dress: string;
  hair: string;
  jacket: string;
  cap: string;
  card: string;
  chair: string;
  /** The lane: doves, petals (two tones), the heart balloons and their lit caps, the paper plane and its letter. */
  bird: string;
  petal: string;
  petalPale: string;
  balloon: string;
  balloonLit: string;
  plane: string;
  letter: string;
  /** The hot-air balloon's cream bands (gold on every other one), its wicker basket, its burner's glow at night. */
  envelope: string;
  envelopeGold: string;
  basket: string;
  burner: string;
  /** The little hearts that float up (over the couple, in the lane). */
  heart: string;
  /** The string lights' wire, and their bulbs in three colors (dim by day, lit at dusk); the lamp's glass bud. */
  wire: string;
  bulb: string;
  bulbPink: string;
  bulbCream: string;
  lamp: string;
  /** How far the lights are on (0 by day, 1 at night): string lights, windows, the wheel, the glass. */
  lights: number;
  /** Stars and moon fade in at dusk (and out at dawn). */
  stars: number;
  moon: number;
  /** The moon's halo medallion (opaque) and its ring. */
  moonHalo: string;
  moonRing: string;
  /** The sun: how far it has set (0 at its day spot, 1 gone into the clouds), body, shade, its halo medallion (opaque) and the ring and dots on it. */
  sunSet: number;
  sunBody: string;
  sunShade: string;
  sunHalo: string;
  sunRing: string;
}

/** Mid-distance color: faded toward the haze, then sunk toward the night. */
function fade(c: string, k: Key, amount: number): string {
  return mix(mix(c, k.haze, amount), NIGHT_SHADOW, k.dark);
}

/** A nearer color (the lane's things): a touch of haze, and only a little of the night. */
function near(c: string, k: Key): string {
  return mix(mix(c, k.haze, 0.1), NIGHT_SHADOW, k.dark * 0.35);
}

/** A color of the sky's own frame: mixed into the sky's middle, then a little of the night. */
function framed(c: string, k: Key, amount: number): string {
  return mix(mix(c, k.sky[1], amount), NIGHT_SHADOW, k.dark * 0.5);
}

function blendKeys(a: Key, b: Key, t: number): Key {
  const m = (x: string, y: string) => mix(x, y, t);
  return {
    at: a.at + (b.at - a.at) * t,
    sky: [m(a.sky[0], b.sky[0]), m(a.sky[1], b.sky[1]), m(a.sky[2], b.sky[2]), m(a.sky[3], b.sky[3])],
    cloud: [m(a.cloud[0], b.cloud[0]), m(a.cloud[1], b.cloud[1]), m(a.cloud[2], b.cloud[2])],
    haze: m(a.haze, b.haze),
    dark: a.dark + (b.dark - a.dark) * t,
  };
}

function keyIn(keys: Key[], lvl: number): Key {
  const last = keys[keys.length - 1]!;
  if (lvl >= last.at) return last;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (lvl > b.at) continue;
    const a = keys[i - 1]!;
    return blendKeys(a, b, smooth(a.at, b.at, lvl));
  }
  return keys[0]!;
}

/**
 * How faded each depth is: the boulevard's fronts, the Ferris wheel, the far city's rows (far to
 * near), the far hill, the dome, the lattice tower, the avenue, the canal and its bridge.
 */
const SHOP = 0.12;
const FAR = 0.3;
const ROWS = [0.46, 0.28, 0.14] as const;
const HILL = 0.78;
const DOME = 0.36;
const TOWER = 0.46;
const AVENUE = 0.2;
const WATERWAY = 0.2;
/** Paris above the clouds, far below. */
const SKYLINE = 0.3;
/** How far toward its floodlight what is floodlit at night goes (the lattice tower, the domes). */
const FLOODLIT = 0.72;

/** What the light does, apart from its colors. */
export interface Light {
  stars: number;
  moon: number;
  sunSet: number;
  /** 0 for the gold of the afternoon, 1 for the orange of sunset and dawn. */
  warm: number;
  lights: number;
}

function toneFrom(k: Key, l: Light): Tone {
  const { warm, lights } = l;
  const lit = (c: string, glow: string) => mix(c, glow, lights);
  const flood = (c: string, glow: string) => mix(c, glow, lights * FLOODLIT);
  const glass = (c: string, glow: string) => lit(fade(c, k, SHOP), glow);
  return {
    sky: k.sky,
    cloudShade: k.cloud[0],
    cloud: k.cloud[1],
    cloudLight: k.cloud[2],
    cloudLine: mix(k.cloud[0], "#7a4a78", 0.32),
    paneRose: alpha(mix("#e2577e", NIGHT_SHADOW, k.dark * 0.4), 0.48),
    paneMint: alpha(mix("#5fbf98", NIGHT_SHADOW, k.dark * 0.4), 0.46),
    rule: framed("#8c5a80", k, 0.25),
    vine: framed("#6f8f62", k, 0.3),
    vineLeaf: framed("#87a677", k, 0.32),
    bloom: framed("#e28aa2", k, 0.22),
    bloomDeep: framed("#b9506f", k, 0.22),
    bud: framed("#fbead2", k, 0.2),
    vineLine: framed("#6a3558", k, 0.3),
    rows: ROWS.map((d) => ({
      stoneLit: fade(LIMESTONE.light, k, d),
      stone: fade(LIMESTONE.body, k, d),
      shade: fade(LIMESTONE.shade, k, d),
      zincLit: fade(ZINC.light, k, d),
      zinc: fade(ZINC.body, k, d),
      zincShade: fade(ZINC.shade, k, d),
      glass: fade(GLASS, k, d),
      quietGlass: fade(mix(LIMESTONE.body, GLASS, 0.32), k, d),
      lit: lit(fade(GLASS, k, d), mix(GLOW, k.haze, d * 0.4)),
      pot: fade(POT, k, d),
      balcony: fade(BALCONY, k, d),
    })),
    hillFar: fade(FAR_HILL, k, HILL),
    basilica: fade(BASILICA, k, HILL - 0.1),
    basilicaShade: fade(BASILICA_SHADE, k, HILL - 0.1),
    giltLit: fade(GILT.light, k, DOME),
    gilt: fade(GILT.body, k, DOME),
    giltShade: fade(GILT.shade, k, DOME),
    drum: fade(LIMESTONE.body, k, DOME),
    drumShade: fade(LIMESTONE.shade, k, DOME),
    bronzeLit: flood(fade(BRONZE.light, k, TOWER), FLOOD_BRONZE.light),
    bronze: flood(fade(BRONZE.body, k, TOWER), FLOOD_BRONZE.body),
    bronzeShade: flood(fade(BRONZE.shade, k, TOWER), FLOOD_BRONZE.shade),
    towerLamp: lit(fade(BRONZE.light, k, TOWER), TOWER_LAMP),
    skyGiltLit: flood(fade(GILT.light, k, SKYLINE), FLOOD_GILT.light),
    skyGilt: flood(fade(GILT.body, k, SKYLINE), FLOOD_GILT.body),
    skyGiltShade: flood(fade(GILT.shade, k, SKYLINE), FLOOD_GILT.shade),
    skyStoneLit: flood(fade(LIMESTONE.light, k, SKYLINE), FLOOD_STONE.light),
    skyStone: flood(fade(LIMESTONE.body, k, SKYLINE), FLOOD_STONE.body),
    skyStoneShade: flood(fade(LIMESTONE.shade, k, SKYLINE), FLOOD_STONE.shade),
    skyWhite: flood(fade(BASILICA, k, SKYLINE), FLOOD_WHITE.body),
    skyWhiteShade: flood(fade(BASILICA_SHADE, k, SKYLINE), FLOOD_WHITE.shade),
    copperLit: flood(fade(COPPER.light, k, SKYLINE), FLOOD_COPPER.light),
    copper: flood(fade(COPPER.body, k, SKYLINE), FLOOD_COPPER.body),
    copperShade: flood(fade(COPPER.shade, k, SKYLINE), FLOOD_COPPER.shade),
    skyWindow: lit(fade(GLASS, k, SKYLINE), GLOW),
    road: fade(ROADWAY, k, AVENUE),
    treeLit: fade(TREE.light, k, AVENUE),
    tree: fade(TREE.body, k, AVENUE),
    treeShade: fade(TREE.shade, k, AVENUE),
    trunk: fade(TRUNK, k, AVENUE),
    wheel: fade(WHEEL_IRON, k, FAR),
    gondola: fade(GONDOLA, k, FAR),
    wheelLit: lit(fade(WHEEL_HUB, k, FAR), TOWER_LAMP),
    pave: fade(PAVEMENT, k, SHOP),
    pave2: fade(KERB, k, SHOP),
    canal: fade(CANAL, k, WATERWAY),
    canalLit: fade(CANAL_LIT, k, WATERWAY),
    stone: fade(QUAY.body, k, WATERWAY),
    stoneLit: fade(QUAY.light, k, WATERWAY),
    stoneShade: fade(QUAY.shade, k, WATERWAY),
    swan: mix(mix("#ffffff", "#ffd9b0", warm * 0.5), NIGHT_SHADOW, k.dark * 0.45),
    houseLit: fade(LIMESTONE.light, k, SHOP),
    house: fade(LIMESTONE.body, k, SHOP),
    houseShade: fade(LIMESTONE.shade, k, SHOP),
    zincLit: fade(ZINC.light, k, SHOP),
    zinc: fade(ZINC.body, k, SHOP),
    zincShade: fade(ZINC.shade, k, SHOP),
    windowGlass: fade(GLASS, k, SHOP),
    balcony: fade(BALCONY, k, SHOP),
    pot: fade(POT, k, SHOP),
    line: fade(CONTOUR, k, SHOP),
    quiet: fade(LIMESTONE.body, k, SHOP),
    quietLit: fade(mix(LIMESTONE.body, LIMESTONE.light, 0.25), k, SHOP),
    quietLine: fade(mix(LIMESTONE.body, LIMESTONE.shade, 0.5), k, SHOP),
    quietGlass: fade(mix(LIMESTONE.body, GLASS, 0.32), k, SHOP),
    quietEdge: fade(mix(LIMESTONE.shade, CONTOUR, 0.3), k, SHOP),
    quietRoof: fade(mix(ZINC.body, LIMESTONE.body, 0.3), k, SHOP),
    roseWoodLit: fade(ROSE_WOOD_LIT, k, SHOP),
    roseWood: fade(ROSE_WOOD, k, SHOP),
    sageWoodLit: fade(SAGE_WOOD_LIT, k, SHOP),
    sageWood: fade(SAGE_WOOD, k, SHOP),
    awning: fade(AWNING, k, SHOP),
    awning2: fade(AWNING_CREAM, k, SHOP),
    iron: fade("#4f7458", k, SHOP),
    glassRose: glass("#e58aa4", "#ffb0c6"),
    glassAmber: glass("#e9b86a", "#ffd890"),
    glassMint: glass("#8fc9b4", "#c4f2dc"),
    lead: fade("#5a3a52", k, SHOP),
    canopy: fade("#94c7ad", k, SHOP),
    canopy2: fade("#fbf0dc", k, SHOP),
    door: fade("#8a4a5e", k, SHOP),
    windowLit: lit(fade(GLASS, k, SHOP), GLOW),
    sign: fade("#fff3e4", k, SHOP),
    rose: fade("#e0405a", k, SHOP),
    tulipY: fade("#ffd23f", k, SHOP),
    tulipP: fade("#ff8ac0", k, SHOP),
    leaf: fade("#4f9a5c", k, SHOP),
    bonbon: fade("#6f3b2b", k, SHOP),
    bonbonPink: fade("#f4a7b9", k, SHOP),
    skin: fade("#ffd8b8", k, 0.14),
    dress: fade("#ff6fa5", k, 0.14),
    hair: fade("#5a3a2c", k, 0.14),
    jacket: fade("#4a6fb8", k, 0.14),
    cap: fade("#3a3a5a", k, 0.14),
    card: fade("#ffb3c6", k, 0.1),
    chair: fade("#45385a", k, 0.14),
    bird: mix(mix("#ffffff", "#ffe0c0", warm * 0.4), NIGHT_SHADOW, k.dark * 0.35),
    petal: near("#ff6f95", k),
    petalPale: near("#ffb6c8", k),
    balloon: near("#ff4f80", k),
    balloonLit: near("#ffa4bd", k),
    plane: mix(mix("#fffaf0", "#ffe3c8", warm * 0.3), NIGHT_SHADOW, k.dark * 0.3),
    letter: near("#ffb3c6", k),
    envelope: near("#fff1e0", k),
    envelopeGold: near("#ffc94a", k),
    basket: near("#b07a52", k),
    burner: "#ffc46b",
    heart: near("#ff3b5c", k),
    wire: fade("#5a4660", k, SHOP),
    bulb: lit(fade("#c9b48a", k, SHOP), "#ffd34a"),
    bulbPink: lit(fade("#c9a0b0", k, SHOP), "#ff8fb8"),
    bulbCream: lit(fade("#d6cbb8", k, SHOP), "#fff3c4"),
    lamp: lit(fade("#d9774f", k, SHOP), "#ffb36b"),
    lights,
    stars: l.stars,
    moon: l.moon,
    moonHalo: mix(k.sky[0], "#d9c6f0", 0.32),
    moonRing: mix(k.sky[0], "#f3e6ff", 0.5),
    sunSet: l.sunSet,
    sunBody: mix("#ffd45a", "#ff9a52", warm),
    sunShade: mix("#f4b13e", "#f0703f", warm),
    sunHalo: mix(mix("#fff1c6", "#ffd2b0", warm), k.sky[0], 0.35),
    sunRing: mix(mix("#e6a24c", "#e8705a", warm), k.sky[0], 0.2),
  };
}

function newLight(): Light {
  return { stars: 0, moon: 0, sunSet: 0, warm: 0, lights: 0 };
}

/**
 * The sun sets from here to there (levels): only once the far city has gone into the mist and
 * the cloud sea has risen to the boulevard's foot (far.ts: by DAY_HIGH), so as it goes down only
 * the cloud sea is ever in front of it.
 */
const SUN_FROM = DUSK - 6;
const SUN_TO = DUSK + 14;
/** At the loop's dawn the sun starts to come up out of the cloud sea this many levels into the dawn; that is SUN_UP levels into the loop's turn. */
const SUN_RISES = 6;
const SUN_UP = NIGHT_HOLD + SUN_RISES;

/** What the light does on the first day at a level (its night holds past NIGHT), into `out`. */
function dayLight(lvl: number, out: Light): Light {
  out.stars = smooth(DUSK + 4, NIGHT - 4, lvl);
  out.moon = smooth(DUSK + 6, NIGHT - 6, lvl);
  out.sunSet = smooth(SUN_FROM, SUN_TO, lvl);
  out.warm = smooth(AFTERNOON, DUSK - 4, lvl);
  out.lights = smooth(DUSK - 10, DUSK + 6, lvl);
  return out;
}

/**
 * What the light does in the loop's dawn at a story level from DAWN_FROM (the night) to
 * AFTERNOON, into `out`: the moon and the stars fade, the lights go out, and the sun comes up
 * out of the clouds orange and warms to the gold of the afternoon. Its ends match the first
 * day's night and afternoon.
 */
function dawnLight(e: number, out: Light): Light {
  const x = e - DAWN_FROM;
  out.stars = 1 - smooth(2, 20, x);
  out.moon = 1 - smooth(2, 18, x);
  out.sunSet = 1 - smooth(SUN_RISES, DAWN_SPAN - 2, x);
  out.warm = 1 - smooth(14, DAWN_SPAN, x);
  out.lights = 1 - smooth(6, 24, x);
  return out;
}

/**
 * How far what stands out of the cloud sea in the sun's path (the roofs and domes on the left,
 * far.ts and skyline.ts) is out of the mist at a level, 0 to 1: never while the sun is low there,
 * so nothing ever stands in front of it. On the first pass it comes out once the sun has set (the
 * evening mist took the city before the sun began to go down); round the loop the dawn mist takes
 * it before the sun comes up out of the clouds, it comes out again once the sun is high, and the
 * evening mist takes it again just as it took the first day's city, before the sun goes down.
 * Continuous, and periodic past LOOP_START.
 */
export function sunSideShow(lvl: number): number {
  if (lvl < LOOP_START) return smooth(SUN_TO, SUN_TO + 6, lvl);
  const x = (lvl - LOOP_START) % LOOP;
  if (x < DAWN_END) return x < DAWN_END / 2 ? 1 - smooth(NIGHT_HOLD + 0.5, SUN_UP - 0.5, x) : smooth(DAWN_END - 8, DAWN_END - 2, x);
  const e = storyLevel(lvl);
  return e < (DUSK + SUN_TO) / 2 ? 1 - smooth(DAY_HIGH - 5, DAY_HIGH - 0.5, e) : smooth(SUN_TO, SUN_TO + 6, e);
}

/**
 * How many of the fireworks of hearts are going up at a level (fireworks.ts), 0 to 1: a night
 * thing, from when the stars are out after the sunset until the dawn mist rises, so never while
 * the sun is in the sky. Continuous, and periodic past LOOP_START.
 */
export function fireworksShow(lvl: number): number {
  if (lvl < LOOP_START) return smooth(SUN_TO + 2, SUN_TO + 10, lvl);
  const x = (lvl - LOOP_START) % LOOP;
  if (x < DAWN_END) return x < DAWN_END / 2 ? 1 - smooth(NIGHT_HOLD + 0.5, SUN_UP - 0.5, x) : 0;
  return smooth(SUN_TO + 2, SUN_TO + 10, storyLevel(lvl));
}

/** The first day's tone at a level (its night holds past NIGHT). */
function dayTone(lvl: number): Tone {
  return toneFrom(keyIn(KEYS, lvl), dayLight(lvl, newLight()));
}

/** The loop's dawn's tone at a story level from DAWN_FROM to AFTERNOON. */
function dawnTone(e: number): Tone {
  return toneFrom(keyIn(DAWN_KEYS, e), dawnLight(e, newLight()));
}

/**
 * What the light does at a level, exactly (not in the colors' half-level steps), into `out`:
 * the first day below LOOP_START; past it the loop's night hold, its dawn, then the first day's
 * story from its afternoon on. Continuous everywhere, and periodic past LOOP_START.
 */
export function skyLightAt(lvl: number, out: Light): Light {
  if (lvl < LOOP_START) return dayLight(Math.max(0, lvl), out);
  const e = storyLevel(lvl);
  if (e < DAWN_FROM) return dayLight(LOOP_START, out);
  if (e < AFTERNOON) return dawnLight(e, out);
  return dayLight(e, out);
}

/** Tones in half-level steps: the first pass up to LOOP_START, then one turn of the loop. */
const STEP = 0.5;
const FIRST: Tone[] = Array.from({ length: Math.round(LOOP_START / STEP) + 1 }, (_, i) => dayTone(i * STEP));
const LOOP_STEPS = Math.round(LOOP / STEP);
const TURN: Tone[] = Array.from({ length: LOOP_STEPS }, (_, i) => {
  const e = storyLevel(LOOP_START + i * STEP);
  if (e < DAWN_FROM) return FIRST[FIRST.length - 1]!;
  if (e < AFTERNOON) return dawnTone(e);
  return FIRST[Math.round(e / STEP)]!;
});

/** Index of a level's tone step (for caching things built from a tone): unique per step. */
function indexAt(lvl: number): number {
  if (lvl < LOOP_START) return Math.max(0, Math.round(lvl / STEP));
  return FIRST.length + (Math.round((lvl - LOOP_START) / STEP) % LOOP_STEPS);
}

function toneAtIndex(i: number): Tone {
  return i < FIRST.length ? FIRST[i]! : TURN[i - FIRST.length]!;
}

/** Scratch for the exact light of `toneOf`. */
const LIGHT = newLight();

/** The step's colors at a level into `out`, with the sun's set, the moon and the stars for the exact level. */
function exactTone(lvl: number, out: Tone): Tone {
  Object.assign(out, toneAtIndex(indexAt(lvl)));
  skyLightAt(lvl, LIGHT);
  out.sunSet = LIGHT.sunSet;
  out.moon = LIGHT.moon;
  out.stars = LIGHT.stars;
  return out;
}

/** The light at a level (camera altitude in levels), as a fresh object. */
export function toneAtLevel(lvl: number): Tone {
  return exactTone(lvl, { ...FIRST[0]! });
}

/** Index of the scene's tone step (for caching things built from a tone). */
export function toneIndex(s: Scene): number {
  return indexAt(level(s));
}

/** The scene's tone, reused from call to call (every layer of a frame asks for it): filled in again only when the level changes. */
const NOW: Tone = { ...FIRST[0]! };
let nowLevel = NaN;

/** The light at the scene's altitude: the colors of its half-level step, the sun, moon and stars exactly where the level puts them. */
export function toneOf(s: Scene): Tone {
  const lvl = level(s);
  if (lvl !== nowLevel) {
    exactTone(lvl, NOW);
    nowLevel = lvl;
  }
  return NOW;
}
