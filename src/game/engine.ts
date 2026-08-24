import type { GameState, Snapshot, Tile } from "./types";
import { SLOT_SIZE } from "./types";
import { freeTiles, generateLevel, isTileFree } from "./generate";
import { getLevel } from "./levels";
import { mulberry32, pickSeed, shuffleInPlace } from "./rng";

function cloneTiles(tiles: Tile[]): Tile[] {
  return tiles.map((t) => ({ ...t }));
}

function snap(state: GameState): Snapshot {
  return {
    tiles: cloneTiles(state.tiles),
    slot: cloneTiles(state.slot),
    holding: cloneTiles(state.holding),
  };
}

function restore(state: GameState, s: Snapshot): GameState {
  return {
    ...state,
    tiles: cloneTiles(s.tiles),
    slot: cloneTiles(s.slot),
    holding: cloneTiles(s.holding),
  };
}

export function insertIntoSlot(slot: Tile[], tile: Tile): Tile[] {
  const next = slot.slice();
  let idx = -1;
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]!.type === tile.type) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) next.splice(idx + 1, 0, tile);
  else next.push(tile);
  return next;
}

export function clearMatches(slot: Tile[]): { slot: Tile[]; removed: Tile[] } {
  let current = slot.slice();
  const removed: Tile[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    const counts = new Map<number, number>();
    for (const t of current) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    for (const [type, n] of counts) {
      if (n < 3) continue;
      let taken = 0;
      const keep: Tile[] = [];
      for (const t of current) {
        if (t.type === type && taken < 3) {
          removed.push(t);
          taken++;
        } else keep.push(t);
      }
      current = keep;
      changed = true;
      break;
    }
  }
  return { slot: current, removed };
}

export function createGame(levelId: number, seed = pickSeed()): GameState {
  const def = getLevel(levelId);
  const rng = mulberry32(seed);
  const tiles = generateLevel(def, rng);
  return {
    status: "playing",
    levelId,
    seed,
    tiles,
    slot: [],
    holding: [],
    undoLeft: def.undo,
    shuffleLeft: def.shuffle,
    removeLeft: def.remove,
    reviveLeft: 1,
    history: [],
    matches: 0,
    combo: 0,
    lastMatchAt: 0,
  };
}

export type PickResult =
  | { ok: false; reason: "blocked" | "busy" | "missing" }
  | { ok: true; state: GameState; matched: Tile[]; flew: Tile };

export function pickTile(state: GameState, tileId: string, now = Date.now()): PickResult {
  if (state.status !== "playing") return { ok: false, reason: "busy" };
  const tile = state.tiles.find((t) => t.id === tileId) ?? state.holding.find((t) => t.id === tileId);
  if (!tile) return { ok: false, reason: "missing" };
  const onBoard = state.tiles.some((t) => t.id === tileId);
  if (onBoard && !isTileFree(tile, state.tiles)) return { ok: false, reason: "blocked" };

  const history = [...state.history, snap(state)].slice(-20);
  const tiles = onBoard ? state.tiles.filter((t) => t.id !== tileId) : state.tiles;
  const holding = onBoard ? state.holding : state.holding.filter((t) => t.id !== tileId);
  const inserted = insertIntoSlot(state.slot, tile);
  const cleared = clearMatches(inserted);
  const matched = cleared.removed;
  const comboWindow = now - state.lastMatchAt < 2600;
  const combo = matched.length ? (comboWindow ? state.combo + 1 : 1) : state.combo;
  let next: GameState = {
    ...state,
    tiles,
    holding,
    slot: cleared.slot,
    history,
    matches: state.matches + matched.length / 3,
    combo,
    lastMatchAt: matched.length ? now : state.lastMatchAt,
  };

  if (next.tiles.length === 0 && next.holding.length === 0 && next.slot.length === 0) {
    next = { ...next, status: "won" };
  } else if (next.slot.length >= SLOT_SIZE) {
    next = { ...next, status: "lost" };
  }
  return { ok: true, state: next, matched, flew: tile };
}

export function undoMove(state: GameState): GameState {
  if (state.status !== "playing" || state.undoLeft <= 0 || state.history.length === 0) return state;
  const prev = state.history[state.history.length - 1]!;
  return {
    ...restore(state, prev),
    history: state.history.slice(0, -1),
    undoLeft: state.undoLeft - 1,
  };
}

export function shuffleBoard(state: GameState): GameState {
  if (state.status !== "playing" || state.shuffleLeft <= 0) return state;
  const rng = mulberry32((state.seed ^ (state.tiles.length * 9973) ^ Date.now()) >>> 0);
  const types = state.tiles.map((t) => t.type);
  shuffleInPlace(types, rng);
  const tiles = state.tiles.map((t, i) => ({ ...t, type: types[i]! }));
  return { ...state, tiles, shuffleLeft: state.shuffleLeft - 1, history: [...state.history, snap(state)].slice(-20) };
}

export function removeFromSlot(state: GameState): GameState {
  if (state.status !== "playing" || state.removeLeft <= 0) return state;
  if (state.slot.length === 0) return state;
  if (state.holding.length >= 3) return state;
  const take = state.slot.slice(0, Math.min(3, state.slot.length));
  const slot = state.slot.slice(take.length);
  const holding = state.holding.concat(
    take.map((t, i) => ({
      ...t,
      x: i * 1.15,
      y: 0,
      z: 99,
    })),
  );
  return {
    ...state,
    slot,
    holding,
    removeLeft: state.removeLeft - 1,
    history: [...state.history, snap(state)].slice(-20),
  };
}

export function revive(state: GameState): GameState {
  if (state.status !== "lost" || state.reviveLeft <= 0) return state;
  const take = state.slot.slice(0, Math.min(3, state.slot.length));
  const slot = state.slot.slice(take.length);
  const holding = state.holding.concat(
    take.map((t, i) => ({
      ...t,
      x: i * 1.15,
      y: 0,
      z: 99,
    })),
  );
  return {
    ...state,
    status: "playing",
    slot,
    holding,
    reviveLeft: 0,
    shuffleLeft: state.shuffleLeft + 1,
    history: [],
  };
}

export function remainingCount(state: GameState): number {
  return state.tiles.length + state.holding.length + state.slot.length;
}

export function hintIds(state: GameState): string[] {
  const free = freeTiles(state.tiles).concat(state.holding);
  const groups = new Map<number, Tile[]>();
  for (const t of free) {
    const arr = groups.get(t.type) ?? [];
    arr.push(t);
    groups.set(t.type, arr);
  }
  let best: Tile[] = [];
  for (const arr of groups.values()) {
    if (arr.length > best.length) best = arr;
  }
  if (best.length >= 3) return best.slice(0, 3).map((t) => t.id);
  // Fall back to a type that also exists in the slot.
  for (const s of state.slot) {
    const extra = groups.get(s.type) ?? [];
    if (extra.length) return extra.slice(0, 2).map((t) => t.id);
  }
  return best.slice(0, 2).map((t) => t.id);
}
