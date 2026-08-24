export const SLOT_SIZE = 7;
export const TILE_UNIT = 1;
export const OVERLAP_EPS = 0.18;

export type Vec3 = { x: number; y: number; z: number };

export type Tile = {
  id: string;
  type: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
};

export type LevelDef = {
  id: number;
  name: string;
  hint: string;
  types: number;
  cols: number;
  rows: number;
  layers: number;
  ease: number;
  undo: number;
  shuffle: number;
  remove: number;
  layout: LayoutKind;
};

export type LayoutKind = "grid" | "inset" | "plus" | "diamond" | "piles";

export type GameStatus = "title" | "playing" | "won" | "lost" | "paused";

export type Snapshot = {
  tiles: Tile[];
  slot: Tile[];
  holding: Tile[];
};

export type GameState = {
  status: GameStatus;
  levelId: number;
  seed: number;
  tiles: Tile[];
  slot: Tile[];
  holding: Tile[];
  undoLeft: number;
  shuffleLeft: number;
  removeLeft: number;
  reviveLeft: number;
  history: Snapshot[];
  matches: number;
  combo: number;
  lastMatchAt: number;
};

export type PersistV1 = {
  version: 1;
  highestLevel: number;
  lastLevel: number;
  sound: boolean;
  reducedFx: boolean;
  gamesWon: number;
  inProgress: null | {
    levelId: number;
    seed: number;
    tiles: Tile[];
    slot: Tile[];
    holding: Tile[];
    undoLeft: number;
    shuffleLeft: number;
    removeLeft: number;
    reviveLeft: number;
    matches: number;
  };
};
