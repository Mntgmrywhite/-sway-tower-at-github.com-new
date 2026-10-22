// Where the cast is drawn among the scenery, back to front (re-exported by stage.ts, which documents
// them; kept in a module of its own so the scenery can name its slots without importing the stage).

/** The cast's slots in the backdrop and the foreground, back to front. */
export const SLOT = { deep: 0, moon: 1, far: 2, mid: 3, hollow: 4, behindNear: 5, near: 6, stone: 7, mist: 8, front: 9 } as const;
export type Slot = (typeof SLOT)[keyof typeof SLOT];

// The SLOT.stone numbers: the churchyard's ghost stones are 0 and 1, then the hill cemetery's
// (village.ts) and the graveyard isle's (isles.ts). Kept here, with no imports, so the stage can
// number its anchors when it loads whatever order the modules load in.
/** The hill cemetery's stones are the stage's STONE anchors from this number on. */
export const HILL_STONE_INDEX = 2;
/** The graveyard isle's stones are the stage's STONE anchors from this number on. */
export const ISLE_STONE_INDEX = 6;
