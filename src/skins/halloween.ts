import { backdrop } from "./halloween/backdrop";
import { PALETTE } from "./halloween/common";
import { floor, FLOOR_BARS } from "./halloween/floors/floor";
import { foreground } from "./halloween/front";
import type { CartoonSkin } from "./skin";

// Halloween: a living Halloween world in a Tim Burton style, all our own designs (never a Disney
// or Nightmare Before Christmas character, sign or distinctive design), silly-spooky, never gory.
// Midnight blues, charcoal, muted purples and ghostly greens; glow is the only brightness (lit
// windows, candles, jack-o'-lanterns, the moon).
//
// The tower is the House of a Hundred Rooms (floors/): every bar is a candy-painted storey of a
// crooked Burton house, its edges and corners the bar's own, its crookedness all in the trim: siding,
// crooked breathing windows that flicker, go dark and sometimes blink like eyes, shutters, lanterns,
// and one lit room where something lives (a witch stirring her cauldron, a spellbook turning its
// pages, a sparking laboratory, a dancing skeleton, an empty rocking chair, a portrait whose eyes
// move, a crooked clock, a shadow behind the curtains, a ghost, a candelabra, a cat on the sill;
// the front door on the ground floor). The top floor wears a crooked roof with a smoking chimney.
// A landing makes the floors under it shudder in their details (shutters rattle, lanterns swing,
// dust falls, panes blink), never in their place.
//
// Behind it everything is painted in one pass (backdrop.ts). The start view is Main Street on
// Halloween night: a huge moon over the Headless Horseman's hill (hollow.ts: he gallops across the
// moon's face into the covered bridge and charges back), a far gothic city on the horizon, the
// crooked mansion on its crag (mansion.ts: windows going dark, smoking chimneys, a torn pennant,
// bats and a crow flock), Main Street lost in fog (street.ts), the corner shops (shops.ts: a
// swinging sign, a rocking birdcage, a smoking chimney, a belvedere), the giant jack-o'-lantern
// changing faces (square.ts), the trick-or-treaters (kids.ts), the moonlit churchyard with its crow
// and its open graves where skeleton parts pop up at random (graveyard.ts), and in front the iron
// railing, cobwebs, hay bales, jack-o'-lanterns and dripping candles (front.ts). Distant lightning
// flashes now and then (lightning.ts), never with reduce motion; fog drifts at every depth.
//
// Height tells the story and loops (tone.ts): over the rooftops (the far village and the hill
// cemetery as the mist gathers; village.ts), the gothic skyline (the cathedral, crooked roofs, a
// near spire, a chimney stack; skyline.ts), the storm over the spires (storm clouds, the bell tower,
// a ledge with a dead tree, lightning revealing a colossus striding behind the spires; storm.ts),
// the spiral sky and the upside-down isles (a witch's cottage, an upside-down graveyard, a stair
// to nowhere, a door in the sky, a hanging house, a looping bridge, a floating castle; isles.ts);
// then the loop: the isles, the witching hour (the moon burns orange, a ring of bats circles it,
// the mansion's clock strikes twelve and the swarm pours out), the storm, the spirals, forever.
// The moon eases up and swells as you climb; nothing crosses it but the Horseman, the crow, the
// ring of bats and the rare great shadow.
//
// The cast performs on the stage (cast.ts, cast/, stage.ts): anchors computed from the scenery's
// own geometry, drawn at the backdrop's slots, back to front: the raven on a chimney, the black cat
// on a ridge looking up at the moon, spiders on their threads, the rat on the railing, ghosts
// rising behind gravestones and drifting through the lanes, shadows behind lit curtains, bats out
// of every belfry, skeletal birds, the sky-eel in the spirals; and rare events, one at a time (a
// colony of bats bursting out, a witch or a great bat across the moon, a skeleton peeking over a
// rooftop, a ghostly carriage, glowing eyes in a dark window). Every clock is deterministic and
// its own, so nothing keeps step; every start-view act comes within 10 s and again and again; the
// tower's column stays calm. A landing startles the cast and nudges what hangs and turns.

export const halloween: CartoonSkin = {
  id: "halloween",
  name: "Halloween",
  dates: [{ from: [10, 1], to: [11, 1] }],
  fonts: ["Creepster"],
  palette: PALETTE,
  // The tower's floors (floors/): candy-painted storeys of a crooked Burton house, each with its
  // lit room; the colors alternate warm / cool and light / dark so every seam reads.
  bars: [...FLOOR_BARS],
  bar: floor,
  hud: {
    display: "Creepster, Impact, 'Arial Black', sans-serif",
    title: "#ff9a2e",
    ui: "#4a2a86",
    accent: "#ffd23f",
    life: "#ff9a2e",
  },
  ground: backdrop,
  paintsBackdrop: true,
  foreground,
};
