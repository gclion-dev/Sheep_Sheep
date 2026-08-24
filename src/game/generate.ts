import type { LayoutKind, LevelDef, Tile, Vec3 } from "./types";
import { OVERLAP_EPS, TILE_UNIT } from "./types";
import { type Rng } from "./rng";

/** Axis-aligned overlap with a small inset so barely-touching edges don't block. */
export function overlaps(a: Tile | Vec3, b: Tile | Vec3, eps = OVERLAP_EPS): boolean {
  const aw = "w" in a ? a.w : TILE_UNIT;
  const ah = "h" in a ? a.h : TILE_UNIT;
  const bw = "w" in b ? b.w : TILE_UNIT;
  const bh = "h" in b ? b.h : TILE_UNIT;
  return !(
    a.x + aw - eps <= b.x ||
    b.x + bw - eps <= a.x ||
    a.y + ah - eps <= b.y ||
    b.y + bh - eps <= a.y
  );
}

export function isTileFree(tile: Tile, others: Tile[]): boolean {
  return !others.some((o) => o.id !== tile.id && o.z > tile.z && overlaps(tile, o));
}

export function freeTiles(tiles: Tile[]): Tile[] {
  return tiles.filter((t) => isTileFree(t, tiles));
}

function pushGrid(
  out: Vec3[],
  cols: number,
  rows: number,
  z: number,
  ox: number,
  oy: number,
  originX = 0,
  originY = 0,
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: originX + c + ox, y: originY + r + oy, z });
    }
  }
}

function layeredGrid(cols: number, rows: number, layers: number, insetEach: boolean): Vec3[] {
  const pos: Vec3[] = [];
  const offset = 0.46;
  for (let z = 0; z < layers; z++) {
    const inset = insetEach ? Math.min(1, Math.floor((z + 1) / 2)) : z === layers - 1 && layers > 2 ? 1 : 0;
    const ox = (z % 2) * offset;
    const oy = ((z % 2) * offset) / 1.15;
    const cN = Math.max(2, cols - inset * 2);
    const rN = Math.max(2, rows - inset * 2);
    pushGrid(pos, cN, rN, z, ox, oy, inset, inset);
  }
  return pos;
}

function plusLayout(cols: number, rows: number, layers: number): Vec3[] {
  const pos = layeredGrid(cols, rows, layers, true);
  const extra: Vec3[] = [];
  const ox = cols / 2 - 1;
  const hy = rows / 2 - 0.5;
  for (let z = 0; z < Math.max(2, layers - 1); z++) {
    const o = (z % 2) * 0.46;
    pushGrid(extra, 2, 2, z, o, o, -1.6, hy - 0.5);
    pushGrid(extra, 2, 2, z, o, o, cols - 0.4, hy - 0.5);
    if (z < 2) pushGrid(extra, 3, 1, z, o, o, ox - 0.5, -1.1);
  }
  return pos.concat(extra);
}

function diamondLayout(cols: number, rows: number, layers: number): Vec3[] {
  const pos: Vec3[] = [];
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const offset = 0.46;
  for (let z = 0; z < layers; z++) {
    const ox = (z % 2) * offset;
    const oy = (z % 2) * offset * 0.9;
    const radius = Math.max(1.6, Math.min(cx, cy) + 0.4 - z * 0.15);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = Math.abs(c - cx);
        const dy = Math.abs(r - cy);
        if (dx / (cx + 0.2) + dy / (cy + 0.2) <= radius / Math.max(cx, cy) + 0.15) {
          pos.push({ x: c + ox, y: r + oy, z });
        }
      }
    }
  }
  return pos;
}

function pilesLayout(cols: number, rows: number, layers: number): Vec3[] {
  const pos = layeredGrid(cols, rows, layers, true);
  const spots: Array<[number, number]> = [
    [1.2, 1.1],
    [cols - 2.4, 1.1],
    [cols / 2 - 0.8, rows / 2 - 0.6],
    [1.4, rows - 2.4],
    [cols - 2.6, rows - 2.4],
  ];
  for (const [sx, sy] of spots) {
    for (let z = 0; z < layers; z++) {
      const o = (z % 2) * 0.42;
      pos.push({ x: sx + o, y: sy + o, z });
      pos.push({ x: sx + 1 + o, y: sy + o, z });
    }
  }
  return pos;
}

function buildPositions(kind: LayoutKind, cols: number, rows: number, layers: number): Vec3[] {
  switch (kind) {
    case "plus":
      return plusLayout(cols, rows, layers);
    case "diamond":
      return diamondLayout(cols, rows, layers);
    case "piles":
      return pilesLayout(cols, rows, layers);
    case "inset":
      return layeredGrid(cols, rows, layers, true);
    default:
      return layeredGrid(cols, rows, layers, false);
  }
}

function uniquePositions(raw: Vec3[]): Vec3[] {
  const seen = new Set<string>();
  const out: Vec3[] = [];
  for (const p of raw) {
    const key = `${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Each type count must be a multiple of 3. */
export function distributeTypes(tileCount: number, typeCount: number): number[] {
  const triples = tileCount / 3;
  const counts = Array.from({ length: typeCount }, () => 0);
  for (let i = 0; i < triples; i++) counts[i % typeCount] += 3;
  return counts;
}

/**
 * Deal matching triples onto the board with an "ease" bias:
 * high ease places more of each triple on currently-exposed (high-z) cells,
 * so early levels actually open with playable matches.
 */
function assignTypes(positions: Vec3[], typeCount: number, ease: number, rng: Rng): Tile[] {
  const counts = distributeTypes(positions.length, typeCount);
  const order = positions.map((_, i) => i);
  order.sort((ia, ib) => {
    const dz = positions[ib]!.z - positions[ia]!.z;
    if (dz) return dz;
    return rng() - 0.5;
  });

  const assigned = new Array<number>(positions.length).fill(-1);
  const used = new Array<boolean>(positions.length).fill(false);

  const pickIndex = (preferHigh: boolean): number => {
    if (preferHigh) {
      for (const i of order) {
        if (!used[i]) {
          used[i] = true;
          return i;
        }
      }
    } else {
      for (let k = order.length - 1; k >= 0; k--) {
        const i = order[k]!;
        if (!used[i]) {
          used[i] = true;
          return i;
        }
      }
    }
    const fallback = used.findIndex((u) => !u);
    if (fallback >= 0) {
      used[fallback] = true;
      return fallback;
    }
    return 0;
  };

  const highN = ease > 0.75 ? 3 : ease > 0.55 ? 2 : ease > 0.35 ? 1 : 0;
  counts.forEach((n, type) => {
    for (let k = 0; k < n; k += 3) {
      for (let m = 0; m < 3; m++) {
        const i = pickIndex(m < highN);
        assigned[i] = type;
      }
    }
  });

  return positions.map((p, i) => ({
    id: `t${i}`,
    type: assigned[i]! < 0 ? 0 : assigned[i]!,
    x: p.x,
    y: p.y,
    z: p.z,
    w: TILE_UNIT,
    h: TILE_UNIT,
  }));
}

export function generateLevel(def: LevelDef, rng: Rng): Tile[] {
  let pos = uniquePositions(buildPositions(def.layout, def.cols, def.rows, def.layers));
  while (pos.length % 3 !== 0) pos.pop();
  if (pos.length < 12) {
    pos = uniquePositions(layeredGrid(Math.max(4, def.cols), Math.max(3, def.rows), 2, false));
    while (pos.length % 3 !== 0) pos.pop();
  }
  const types = Math.max(2, Math.min(def.types, 16, Math.floor(pos.length / 3)));
  return assignTypes(pos, types, def.ease, rng);
}

export function boardBounds(tiles: Tile[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!tiles.length) return { minX: 0, minY: 0, maxX: 4, maxY: 3 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of tiles) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + t.w);
    maxY = Math.max(maxY, t.y + t.h);
  }
  return { minX, minY, maxX, maxY };
}
