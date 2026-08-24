import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Shuffle, c as Pause, d as ArrowDownToLine, l as Lightbulb, n as Volume2, o as RotateCcw, r as Undo2, s as Play, t as VolumeX, u as House } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-JEUdN4ES.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var OVERLAP_EPS = .18;
/** Axis-aligned overlap with a small inset so barely-touching edges don't block. */
function overlaps(a, b, eps = OVERLAP_EPS) {
	const aw = "w" in a ? a.w : 1;
	const ah = "h" in a ? a.h : 1;
	const bw = "w" in b ? b.w : 1;
	const bh = "h" in b ? b.h : 1;
	return !(a.x + aw - eps <= b.x || b.x + bw - eps <= a.x || a.y + ah - eps <= b.y || b.y + bh - eps <= a.y);
}
function isTileFree(tile, others) {
	return !others.some((o) => o.id !== tile.id && o.z > tile.z && overlaps(tile, o));
}
function freeTiles(tiles) {
	return tiles.filter((t) => isTileFree(t, tiles));
}
function pushGrid(out, cols, rows, z, ox, oy, originX = 0, originY = 0) {
	for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({
		x: originX + c + ox,
		y: originY + r + oy,
		z
	});
}
function layeredGrid(cols, rows, layers, insetEach) {
	const pos = [];
	const offset = .46;
	for (let z = 0; z < layers; z++) {
		const inset = insetEach ? Math.min(1, Math.floor((z + 1) / 2)) : z === layers - 1 && layers > 2 ? 1 : 0;
		const ox = z % 2 * offset;
		const oy = z % 2 * offset / 1.15;
		pushGrid(pos, Math.max(2, cols - inset * 2), Math.max(2, rows - inset * 2), z, ox, oy, inset, inset);
	}
	return pos;
}
function plusLayout(cols, rows, layers) {
	const pos = layeredGrid(cols, rows, layers, true);
	const extra = [];
	const ox = cols / 2 - 1;
	const hy = rows / 2 - .5;
	for (let z = 0; z < Math.max(2, layers - 1); z++) {
		const o = z % 2 * .46;
		pushGrid(extra, 2, 2, z, o, o, -1.6, hy - .5);
		pushGrid(extra, 2, 2, z, o, o, cols - .4, hy - .5);
		if (z < 2) pushGrid(extra, 3, 1, z, o, o, ox - .5, -1.1);
	}
	return pos.concat(extra);
}
function diamondLayout(cols, rows, layers) {
	const pos = [];
	const cx = (cols - 1) / 2;
	const cy = (rows - 1) / 2;
	const offset = .46;
	for (let z = 0; z < layers; z++) {
		const ox = z % 2 * offset;
		const oy = z % 2 * offset * .9;
		const radius = Math.max(1.6, Math.min(cx, cy) + .4 - z * .15);
		for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
			const dx = Math.abs(c - cx);
			const dy = Math.abs(r - cy);
			if (dx / (cx + .2) + dy / (cy + .2) <= radius / Math.max(cx, cy) + .15) pos.push({
				x: c + ox,
				y: r + oy,
				z
			});
		}
	}
	return pos;
}
function pilesLayout(cols, rows, layers) {
	const pos = layeredGrid(cols, rows, layers, true);
	const spots = [
		[1.2, 1.1],
		[cols - 2.4, 1.1],
		[cols / 2 - .8, rows / 2 - .6],
		[1.4, rows - 2.4],
		[cols - 2.6, rows - 2.4]
	];
	for (const [sx, sy] of spots) for (let z = 0; z < layers; z++) {
		const o = z % 2 * .42;
		pos.push({
			x: sx + o,
			y: sy + o,
			z
		});
		pos.push({
			x: sx + 1 + o,
			y: sy + o,
			z
		});
	}
	return pos;
}
function buildPositions(kind, cols, rows, layers) {
	switch (kind) {
		case "plus": return plusLayout(cols, rows, layers);
		case "diamond": return diamondLayout(cols, rows, layers);
		case "piles": return pilesLayout(cols, rows, layers);
		case "inset": return layeredGrid(cols, rows, layers, true);
		default: return layeredGrid(cols, rows, layers, false);
	}
}
function uniquePositions(raw) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const p of raw) {
		const key = `${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.z}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(p);
	}
	return out;
}
/** Each type count must be a multiple of 3. */
function distributeTypes(tileCount, typeCount) {
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
function assignTypes(positions, typeCount, ease, rng) {
	const counts = distributeTypes(positions.length, typeCount);
	const order = positions.map((_, i) => i);
	order.sort((ia, ib) => {
		const dz = positions[ib].z - positions[ia].z;
		if (dz) return dz;
		return rng() - .5;
	});
	const assigned = new Array(positions.length).fill(-1);
	const used = new Array(positions.length).fill(false);
	const pickIndex = (preferHigh) => {
		if (preferHigh) {
			for (const i of order) if (!used[i]) {
				used[i] = true;
				return i;
			}
		} else for (let k = order.length - 1; k >= 0; k--) {
			const i = order[k];
			if (!used[i]) {
				used[i] = true;
				return i;
			}
		}
		const fallback = used.findIndex((u) => !u);
		if (fallback >= 0) {
			used[fallback] = true;
			return fallback;
		}
		return 0;
	};
	const highN = ease > .75 ? 3 : ease > .55 ? 2 : ease > .35 ? 1 : 0;
	counts.forEach((n, type) => {
		for (let k = 0; k < n; k += 3) for (let m = 0; m < 3; m++) {
			const i = pickIndex(m < highN);
			assigned[i] = type;
		}
	});
	return positions.map((p, i) => ({
		id: `t${i}`,
		type: assigned[i] < 0 ? 0 : assigned[i],
		x: p.x,
		y: p.y,
		z: p.z,
		w: 1,
		h: 1
	}));
}
function generateLevel(def, rng) {
	let pos = uniquePositions(buildPositions(def.layout, def.cols, def.rows, def.layers));
	while (pos.length % 3 !== 0) pos.pop();
	if (pos.length < 12) {
		pos = uniquePositions(layeredGrid(Math.max(4, def.cols), Math.max(3, def.rows), 2, false));
		while (pos.length % 3 !== 0) pos.pop();
	}
	const types = Math.max(2, Math.min(def.types, 16, Math.floor(pos.length / 3)));
	return assignTypes(pos, types, def.ease, rng);
}
function boardBounds(tiles) {
	if (!tiles.length) return {
		minX: 0,
		minY: 0,
		maxX: 4,
		maxY: 3
	};
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const t of tiles) {
		minX = Math.min(minX, t.x);
		minY = Math.min(minY, t.y);
		maxX = Math.max(maxX, t.x + t.w);
		maxY = Math.max(maxY, t.y + t.h);
	}
	return {
		minX,
		minY,
		maxX,
		maxY
	};
}
var LEVELS = [
	{
		id: 1,
		name: "初入牧场",
		hint: "点没有被压住的牌，三个相同就会消除。",
		types: 3,
		cols: 4,
		rows: 3,
		layers: 2,
		ease: .9,
		undo: 3,
		shuffle: 2,
		remove: 2,
		layout: "grid"
	},
	{
		id: 2,
		name: "青草堆",
		hint: "上层会挡住下层。先拆开的牌。",
		types: 4,
		cols: 5,
		rows: 4,
		layers: 3,
		ease: .75,
		undo: 3,
		shuffle: 2,
		remove: 2,
		layout: "inset"
	},
	{
		id: 3,
		name: "羊毛垛",
		hint: "槽位只有 7 格，满了就失败。",
		types: 5,
		cols: 5,
		rows: 4,
		layers: 4,
		ease: .62,
		undo: 2,
		shuffle: 2,
		remove: 2,
		layout: "plus"
	},
	{
		id: 4,
		name: "丰收季",
		hint: "撤回、洗牌、移出能帮你解围。",
		types: 6,
		cols: 6,
		rows: 5,
		layers: 4,
		ease: .5,
		undo: 2,
		shuffle: 2,
		remove: 1,
		layout: "inset"
	},
	{
		id: 5,
		name: "迷雾羊圈",
		hint: "同种牌会尽量挤在一起，方便三消。",
		types: 7,
		cols: 6,
		rows: 5,
		layers: 5,
		ease: .42,
		undo: 2,
		shuffle: 1,
		remove: 1,
		layout: "diamond"
	},
	{
		id: 6,
		name: "层层叠叠",
		hint: "先清边上露出的牌，再挖中间。",
		types: 8,
		cols: 7,
		rows: 6,
		layers: 5,
		ease: .34,
		undo: 2,
		shuffle: 1,
		remove: 1,
		layout: "piles"
	},
	{
		id: 7,
		name: "羊村集市",
		hint: "种类变多了，槽位更要精打细算。",
		types: 10,
		cols: 7,
		rows: 6,
		layers: 6,
		ease: .28,
		undo: 1,
		shuffle: 1,
		remove: 1,
		layout: "plus"
	},
	{
		id: 8,
		name: "终极牧场",
		hint: "这关很密。卡住就洗牌。",
		types: 12,
		cols: 8,
		rows: 6,
		layers: 6,
		ease: .22,
		undo: 1,
		shuffle: 1,
		remove: 1,
		layout: "piles"
	}
];
function getLevel(id) {
	const named = LEVELS.find((l) => l.id === id);
	if (named) return named;
	const extra = id - LEVELS.length;
	const types = Math.min(16, 8 + extra);
	return {
		id,
		name: `无尽牧场 ${extra}`,
		hint: "层数和种类会继续往上加。",
		types,
		cols: Math.min(8, 6 + Math.floor(extra / 2)),
		rows: Math.min(7, 5 + Math.floor(extra / 3)),
		layers: Math.min(8, 5 + Math.floor(extra / 2)),
		ease: Math.max(.12, .28 - extra * .02),
		undo: extra % 2 === 0 ? 2 : 1,
		shuffle: 1,
		remove: extra % 3 === 0 ? 2 : 1,
		layout: extra % 2 === 0 ? "piles" : "inset"
	};
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function shuffleInPlace(arr, rng) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}
	return arr;
}
function pickSeed() {
	return Math.random() * 4294967295 >>> 0;
}
function cloneTiles(tiles) {
	return tiles.map((t) => ({ ...t }));
}
function snap(state) {
	return {
		tiles: cloneTiles(state.tiles),
		slot: cloneTiles(state.slot),
		holding: cloneTiles(state.holding)
	};
}
function restore(state, s) {
	return {
		...state,
		tiles: cloneTiles(s.tiles),
		slot: cloneTiles(s.slot),
		holding: cloneTiles(s.holding)
	};
}
function insertIntoSlot(slot, tile) {
	const next = slot.slice();
	let idx = -1;
	for (let i = next.length - 1; i >= 0; i--) if (next[i].type === tile.type) {
		idx = i;
		break;
	}
	if (idx >= 0) next.splice(idx + 1, 0, tile);
	else next.push(tile);
	return next;
}
function clearMatches(slot) {
	let current = slot.slice();
	const removed = [];
	let changed = true;
	while (changed) {
		changed = false;
		const counts = /* @__PURE__ */ new Map();
		for (const t of current) counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
		for (const [type, n] of counts) {
			if (n < 3) continue;
			let taken = 0;
			const keep = [];
			for (const t of current) if (t.type === type && taken < 3) {
				removed.push(t);
				taken++;
			} else keep.push(t);
			current = keep;
			changed = true;
			break;
		}
	}
	return {
		slot: current,
		removed
	};
}
function createGame(levelId, seed = pickSeed()) {
	const def = getLevel(levelId);
	return {
		status: "playing",
		levelId,
		seed,
		tiles: generateLevel(def, mulberry32(seed)),
		slot: [],
		holding: [],
		undoLeft: def.undo,
		shuffleLeft: def.shuffle,
		removeLeft: def.remove,
		reviveLeft: 1,
		history: [],
		matches: 0,
		combo: 0,
		lastMatchAt: 0
	};
}
function pickTile(state, tileId, now = Date.now()) {
	if (state.status !== "playing") return {
		ok: false,
		reason: "busy"
	};
	const tile = state.tiles.find((t) => t.id === tileId) ?? state.holding.find((t) => t.id === tileId);
	if (!tile) return {
		ok: false,
		reason: "missing"
	};
	const onBoard = state.tiles.some((t) => t.id === tileId);
	if (onBoard && !isTileFree(tile, state.tiles)) return {
		ok: false,
		reason: "blocked"
	};
	const history = [...state.history, snap(state)].slice(-20);
	const tiles = onBoard ? state.tiles.filter((t) => t.id !== tileId) : state.tiles;
	const holding = onBoard ? state.holding : state.holding.filter((t) => t.id !== tileId);
	const cleared = clearMatches(insertIntoSlot(state.slot, tile));
	const matched = cleared.removed;
	const comboWindow = now - state.lastMatchAt < 2600;
	const combo = matched.length ? comboWindow ? state.combo + 1 : 1 : state.combo;
	let next = {
		...state,
		tiles,
		holding,
		slot: cleared.slot,
		history,
		matches: state.matches + matched.length / 3,
		combo,
		lastMatchAt: matched.length ? now : state.lastMatchAt
	};
	if (next.tiles.length === 0 && next.holding.length === 0 && next.slot.length === 0) next = {
		...next,
		status: "won"
	};
	else if (next.slot.length >= 7) next = {
		...next,
		status: "lost"
	};
	return {
		ok: true,
		state: next,
		matched,
		flew: tile
	};
}
function undoMove(state) {
	if (state.status !== "playing" || state.undoLeft <= 0 || state.history.length === 0) return state;
	const prev = state.history[state.history.length - 1];
	return {
		...restore(state, prev),
		history: state.history.slice(0, -1),
		undoLeft: state.undoLeft - 1
	};
}
function shuffleBoard(state) {
	if (state.status !== "playing" || state.shuffleLeft <= 0) return state;
	const rng = mulberry32((state.seed ^ state.tiles.length * 9973 ^ Date.now()) >>> 0);
	const types = state.tiles.map((t) => t.type);
	shuffleInPlace(types, rng);
	const tiles = state.tiles.map((t, i) => ({
		...t,
		type: types[i]
	}));
	return {
		...state,
		tiles,
		shuffleLeft: state.shuffleLeft - 1,
		history: [...state.history, snap(state)].slice(-20)
	};
}
function removeFromSlot(state) {
	if (state.status !== "playing" || state.removeLeft <= 0) return state;
	if (state.slot.length === 0) return state;
	if (state.holding.length >= 3) return state;
	const take = state.slot.slice(0, Math.min(3, state.slot.length));
	const slot = state.slot.slice(take.length);
	const holding = state.holding.concat(take.map((t, i) => ({
		...t,
		x: i * 1.15,
		y: 0,
		z: 99
	})));
	return {
		...state,
		slot,
		holding,
		removeLeft: state.removeLeft - 1,
		history: [...state.history, snap(state)].slice(-20)
	};
}
function revive(state) {
	if (state.status !== "lost" || state.reviveLeft <= 0) return state;
	const take = state.slot.slice(0, Math.min(3, state.slot.length));
	const slot = state.slot.slice(take.length);
	const holding = state.holding.concat(take.map((t, i) => ({
		...t,
		x: i * 1.15,
		y: 0,
		z: 99
	})));
	return {
		...state,
		status: "playing",
		slot,
		holding,
		reviveLeft: 0,
		shuffleLeft: state.shuffleLeft + 1,
		history: []
	};
}
function remainingCount(state) {
	return state.tiles.length + state.holding.length + state.slot.length;
}
function hintIds(state) {
	const free = freeTiles(state.tiles).concat(state.holding);
	const groups = /* @__PURE__ */ new Map();
	for (const t of free) {
		const arr = groups.get(t.type) ?? [];
		arr.push(t);
		groups.set(t.type, arr);
	}
	let best = [];
	for (const arr of groups.values()) if (arr.length > best.length) best = arr;
	if (best.length >= 3) return best.slice(0, 3).map((t) => t.id);
	for (const s of state.slot) {
		const extra = groups.get(s.type) ?? [];
		if (extra.length) return extra.slice(0, 2).map((t) => t.id);
	}
	return best.slice(0, 2).map((t) => t.id);
}
var KEY = "sheep-stack-save-v1";
var VERSION = 1;
var defaults = {
	version: VERSION,
	highestLevel: 1,
	lastLevel: 1,
	sound: true,
	reducedFx: false,
	gamesWon: 0,
	inProgress: null
};
function loadSave() {
	if (typeof window === "undefined") return { ...defaults };
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return { ...defaults };
		const parsed = JSON.parse(raw);
		if (parsed.version !== VERSION) return { ...defaults };
		return {
			...defaults,
			...parsed,
			version: VERSION,
			inProgress: parsed.inProgress ?? null
		};
	} catch {
		return { ...defaults };
	}
}
function writeSave(next) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
}
function patchSave(partial) {
	const next = {
		...loadSave(),
		...partial,
		version: VERSION
	};
	writeSave(next);
	return next;
}
var TILE_KINDS = [
	{
		id: 0,
		key: "sheep",
		name: "绵羊",
		src: "/tiles/tile-1.png",
		accent: "#f3efe6"
	},
	{
		id: 1,
		key: "wool",
		name: "毛线",
		src: "/tiles/tile-2.png",
		accent: "#efe4cc"
	},
	{
		id: 2,
		key: "clover",
		name: "三叶草",
		src: "/tiles/tile-3.png",
		accent: "#d7ead0"
	},
	{
		id: 3,
		key: "carrot",
		name: "胡萝卜",
		src: "/tiles/tile-4.png",
		accent: "#f3d7c0"
	},
	{
		id: 4,
		key: "apple",
		name: "苹果",
		src: "/tiles/tile-5.png",
		accent: "#f0d0c8"
	},
	{
		id: 5,
		key: "sunflower",
		name: "向日葵",
		src: "/tiles/tile-6.png",
		accent: "#efe3b8"
	},
	{
		id: 6,
		key: "chick",
		name: "小鸡",
		src: "/tiles/tile-7.png",
		accent: "#f3e6b8"
	},
	{
		id: 7,
		key: "mushroom",
		name: "蘑菇",
		src: "/tiles/tile-8.png",
		accent: "#f0d4d0"
	},
	{
		id: 8,
		key: "corn",
		name: "玉米",
		src: "/tiles/tile-9.png",
		accent: "#efe6b4"
	},
	{
		id: 9,
		key: "berry",
		name: "草莓",
		src: "/tiles/tile-10.png",
		accent: "#f0cfd0"
	},
	{
		id: 10,
		key: "milk",
		name: "牛奶",
		src: "/tiles/tile-11.png",
		accent: "#e8eef0"
	},
	{
		id: 11,
		key: "bell",
		name: "铃铛",
		src: "/tiles/tile-12.png",
		accent: "#eadcc0"
	},
	{
		id: 12,
		key: "honey",
		name: "蜂蜜",
		src: "/tiles/tile-13.png",
		accent: "#efe0b0"
	},
	{
		id: 13,
		key: "leaf",
		name: "叶子",
		src: "/tiles/tile-14.png",
		accent: "#d6e8c8"
	},
	{
		id: 14,
		key: "butterfly",
		name: "蝴蝶",
		src: "/tiles/tile-15.png",
		accent: "#f0d8c0"
	},
	{
		id: 15,
		key: "basket",
		name: "竹篮",
		src: "/tiles/tile-16.png",
		accent: "#e8d8c0"
	}
];
var ctx = null;
var master = null;
var sfx = null;
var enabled = true;
function bus() {
	if (!enabled || typeof window === "undefined") return null;
	if (!ctx) {
		ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
		master = ctx.createGain();
		sfx = ctx.createGain();
		sfx.gain.value = .7;
		master.gain.value = .85;
		sfx.connect(master);
		master.connect(ctx.destination);
	}
	if (ctx.state === "suspended") ctx.resume();
	return {
		ctx,
		sfx
	};
}
function unlockAudio() {
	bus();
}
function setSoundEnabled(on) {
	enabled = on;
	if (master) master.gain.setTargetAtTime(on ? .85 : 0, ctx?.currentTime ?? 0, .02);
}
function tone(freq, dur, type, gain = .07, slide = 0) {
	const b = bus();
	if (!b) return;
	const { ctx: c, sfx: s } = b;
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, c.currentTime);
	if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
	g.gain.setValueAtTime(gain, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur);
	o.connect(g);
	g.connect(s);
	o.start();
	o.stop(c.currentTime + dur + .02);
}
function sfxPick() {
	const jitter = 1 + (Math.random() * .12 - .06);
	tone(620 * jitter, .07, "triangle", .05);
	tone(930 * jitter, .05, "sine", .03);
}
function sfxBlocked() {
	tone(180, .12, "square", .04, -40);
}
function sfxMatch(combo = 1) {
	const base = 520 + Math.min(combo, 6) * 40;
	tone(base, .12, "triangle", .06);
	tone(base * 1.26, .16, "sine", .05);
	tone(base * 1.5, .2, "sine", .03);
}
function sfxWin() {
	[
		523,
		659,
		784,
		1046
	].forEach((f, i) => {
		window.setTimeout(() => tone(f, .22, "triangle", .06), i * 90);
	});
}
function sfxLose() {
	tone(240, .18, "sawtooth", .04, -80);
	window.setTimeout(() => tone(160, .28, "triangle", .05, -40), 90);
}
function sfxUi() {
	tone(480, .05, "sine", .03);
}
function sfxShuffle() {
	tone(300, .08, "triangle", .04, 120);
	window.setTimeout(() => tone(420, .08, "triangle", .04, 80), 70);
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function TileFace({ type, className, blocked, hint, shake }) {
	const kind = TILE_KINDS[type] ?? TILE_KINDS[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("tile-card relative h-full w-full", shake && "shake", className),
		"data-blocked": blocked ? "true" : "false",
		"data-free": blocked ? "false" : "true",
		"data-hint": hint ? "true" : "false",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: kind.src,
			alt: kind.name,
			draggable: false,
			className: "pointer-events-none h-full w-full object-contain p-[9%]"
		})
	});
}
function persistProgress(game, extra = {}) {
	const prev = loadSave();
	const reached = game.status === "won" ? game.levelId + 1 : game.levelId;
	patchSave({
		lastLevel: game.levelId,
		highestLevel: Math.max(prev.highestLevel, reached),
		inProgress: game.status === "won" ? null : {
			levelId: game.levelId,
			seed: game.seed,
			tiles: game.tiles,
			slot: game.slot,
			holding: game.holding,
			undoLeft: game.undoLeft,
			shuffleLeft: game.shuffleLeft,
			removeLeft: game.removeLeft,
			reviveLeft: game.reviveLeft,
			matches: game.matches
		},
		...extra
	});
}
function GameApp() {
	const [save, setSave] = (0, import_react.useState)(defaults);
	const [screen, setScreen] = (0, import_react.useState)("title");
	const [game, setGame] = (0, import_react.useState)(null);
	const [hint, setHint] = (0, import_react.useState)([]);
	const [shakeId, setShakeId] = (0, import_react.useState)(null);
	const [banner, setBanner] = (0, import_react.useState)(null);
	const [helpOpen, setHelpOpen] = (0, import_react.useState)(false);
	const boardWrap = (0, import_react.useRef)(null);
	const [boardScale, setBoardScale] = (0, import_react.useState)(1);
	(0, import_react.useEffect)(() => {
		const s = loadSave();
		setSave(s);
		setSoundEnabled(s.sound);
		for (const k of TILE_KINDS) {
			const img = new Image();
			img.src = k.src;
		}
	}, []);
	(0, import_react.useEffect)(() => {
		setSoundEnabled(save.sound);
	}, [save.sound]);
	(0, import_react.useEffect)(() => {
		const onVis = () => {
			if (document.visibilityState === "hidden" && game?.status === "playing") persistProgress(game);
		};
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, [game]);
	const startLevel = (0, import_react.useCallback)((levelId) => {
		unlockAudio();
		sfxUi();
		const next = createGame(levelId);
		setGame(next);
		setHint([]);
		setBanner(null);
		setScreen("play");
		persistProgress(next);
		setSave(loadSave());
	}, []);
	const resumeRun = (0, import_react.useCallback)(() => {
		const fresh = loadSave();
		if (!fresh.inProgress) return;
		unlockAudio();
		sfxUi();
		const p = fresh.inProgress;
		setGame({
			status: p.slot.length >= 7 ? "lost" : "playing",
			levelId: p.levelId,
			seed: p.seed,
			tiles: p.tiles,
			slot: p.slot,
			holding: p.holding,
			undoLeft: p.undoLeft,
			shuffleLeft: p.shuffleLeft,
			removeLeft: p.removeLeft,
			reviveLeft: p.reviveLeft,
			history: [],
			matches: p.matches,
			combo: 0,
			lastMatchAt: 0
		});
		setScreen("play");
		setHint([]);
	}, []);
	const apply = (0, import_react.useCallback)((next, note) => {
		setGame(next);
		setHint([]);
		if (next.status === "won") {
			persistProgress(next, { gamesWon: loadSave().gamesWon + 1 });
			sfxWin();
		} else {
			persistProgress(next);
			if (next.status === "lost") sfxLose();
		}
		setSave(loadSave());
		if (note) {
			setBanner(note);
			window.setTimeout(() => setBanner((b) => b === note ? null : b), 900);
		}
	}, []);
	const onPick = (tile) => {
		if (!game || game.status !== "playing") return;
		const result = pickTile(game, tile.id);
		if (!result.ok) {
			if (result.reason === "blocked") {
				sfxBlocked();
				setShakeId(tile.id);
				window.setTimeout(() => setShakeId((id) => id === tile.id ? null : id), 280);
			}
			return;
		}
		sfxPick();
		if (result.matched.length) {
			sfxMatch(result.state.combo);
			apply(result.state, result.state.combo > 1 ? `连消 ×${result.state.combo}` : "消除");
		} else apply(result.state);
	};
	const level = game ? getLevel(game.levelId) : getLevel(1);
	const remaining = game ? remainingCount(game) : 0;
	const allTiles = game ? game.tiles : [];
	const bounds = (0, import_react.useMemo)(() => boardBounds(allTiles), [allTiles]);
	(0, import_react.useEffect)(() => {
		const el = boardWrap.current;
		if (!el || !game) return;
		const measure = () => {
			const unit = 58;
			const bw = Math.max(1, bounds.maxX - bounds.minX) * unit;
			const bh = Math.max(1, bounds.maxY - bounds.minY) * unit;
			const rect = el.getBoundingClientRect();
			const s = Math.min(rect.width / bw, rect.height / bh, 1.2);
			setBoardScale(Number.isFinite(s) && s > 0 ? s : 1);
		};
		measure();
		const obs = new ResizeObserver(measure);
		obs.observe(el);
		return () => obs.disconnect();
	}, [
		game,
		bounds.maxX,
		bounds.minX,
		bounds.maxY,
		bounds.minY,
		allTiles.length
	]);
	const toggleSound = () => {
		const next = patchSave({ sound: !save.sound });
		setSave(next);
		setSoundEnabled(next.sound);
		unlockAudio();
		sfxUi();
	};
	if (screen === "title" || !game) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "meadow-shell flex flex-col items-center px-4 pb-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/game/sheep.png",
					alt: "",
					className: "h-36 w-36 object-contain drop-shadow-md sm:h-44 sm:w-44",
					style: { animation: "floaty 2.4s ease-in-out infinite alternate" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium tracking-wide text-accent",
							children: "三消叠叠乐"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 text-5xl leading-tight text-ink sm:text-6xl",
							children: "羊了个羊"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "点开没被压住的牌，三个相同即可消除"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex w-full max-w-xs flex-col gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => startLevel(Math.min(save.highestLevel, 99) || 1),
						className: "h-12 rounded-xl bg-accent text-base font-semibold text-accent-fg shadow-sm transition-transform duration-150 active:scale-[0.98]",
						children: "开始游戏"
					}), save.inProgress ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: resumeRun,
						className: "h-12 rounded-xl bg-surface text-base font-medium text-ink shadow-sm ring-1 ring-line transition-transform duration-150 active:scale-[0.98]",
						children: [
							"继续第 ",
							save.inProgress.levelId,
							" 关"
						]
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "tabular-nums text-sm text-muted",
					children: [
						"最高到达第 ",
						save.highestLevel,
						" 关 · 通关 ",
						save.gamesWon,
						" 次"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setHelpOpen((v) => !v),
					className: "text-sm font-medium text-accent underline-offset-4 hover:underline",
					children: helpOpen ? "收起玩法" : "怎么玩"
				}),
				helpOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "panel w-full max-w-sm rounded-xl px-5 py-4 text-sm text-ink",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "py-1",
							children: "1. 只能点最上面、没有被压住的牌。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "py-1",
							children: "2. 牌会进入下方 7 格槽位，相同的会靠在一起。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "py-1",
							children: "3. 三个相同就会消除。全部消完过关。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "py-1",
							children: "4. 槽位满了失败。撤回、洗牌、移出能解围。"
						})
					]
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 flex items-center gap-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: toggleSound,
				className: "inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink ring-1 ring-line",
				"aria-label": save.sound ? "关闭音效" : "开启音效",
				children: [save.sound ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }), save.sound ? "音效开" : "音效关"]
			})
		})]
	});
	const unit = 58;
	const bw = Math.max(1, bounds.maxX - bounds.minX) * unit;
	const bh = Math.max(1, bounds.maxY - bounds.minY) * unit;
	const paused = game.status === "paused";
	const overlay = game.status === "won" || game.status === "lost" || paused;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "meadow-shell relative flex h-svh flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mx-auto flex w-full max-w-lg items-center gap-2 px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-line",
						onClick: () => {
							sfxUi();
							persistProgress(game);
							setGame({
								...game,
								status: "paused"
							});
						},
						"aria-label": "暂停",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1 rounded-xl bg-surface/90 px-3 py-2 ring-1 ring-line",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate font-display text-base leading-tight text-ink",
							children: [
								"第 ",
								game.levelId,
								" 关 · ",
								level.name
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted",
							children: level.hint
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-surface/90 px-3 py-2 text-right ring-1 ring-line",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "剩余"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg leading-none tabular-nums text-ink",
							children: remaining
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: boardWrap,
				className: "relative mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center justify-center px-2",
				children: [allTiles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "槽位里的牌消完就过关"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative",
					style: {
						width: bw * boardScale,
						height: bh * boardScale
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute left-0 top-0 origin-top-left",
						style: {
							width: bw,
							height: bh,
							transform: `scale(${boardScale})`
						},
						children: allTiles.slice().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x).map((tile) => {
							const free = isTileFree(tile, allTiles);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "absolute p-0",
								style: {
									left: (tile.x - bounds.minX) * unit,
									top: (tile.y - bounds.minY) * unit,
									width: 54,
									height: 54,
									zIndex: tile.z * 40 + Math.round(tile.y * 8)
								},
								disabled: !free || game.status !== "playing",
								onClick: () => onPick(tile),
								"aria-label": free ? "可点" : "被压住",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileFace, {
									type: tile.type,
									blocked: !free,
									hint: hint.includes(tile.id),
									shake: shakeId === tile.id
								})
							}, tile.id);
						})
					})
				}), banner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute inset-x-0 top-4 flex justify-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "pop-in rounded-full bg-accent px-4 py-1.5 font-display text-lg text-accent-fg shadow-md",
						children: banner
					})
				}) : null]
			}),
			game.holding.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex w-full max-w-lg justify-center gap-2 px-3 pb-1",
				children: game.holding.map((tile) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "size-14 p-0",
					onClick: () => onPick(tile),
					"aria-label": "移出区",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileFace, { type: tile.type })
				}, tile.id))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "mx-auto w-full max-w-lg px-3 pb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-surface/95 p-3 shadow-sm ring-1 ring-line",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 grid grid-cols-7 gap-1.5",
						children: Array.from({ length: 7 }, (_, i) => {
							const tile = game.slot[i];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "aspect-square rounded-sm bg-slot ring-1 ring-line",
								children: tile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileFace, {
									type: tile.type,
									className: "pop-in"
								}) : null
							}, i);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-4 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerBtn, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "size-4" }),
								label: "撤回",
								count: game.undoLeft,
								disabled: game.status !== "playing" || game.undoLeft <= 0 || game.history.length === 0,
								onClick: () => {
									sfxUi();
									apply(undoMove(game));
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerBtn, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, { className: "size-4" }),
								label: "洗牌",
								count: game.shuffleLeft,
								disabled: game.status !== "playing" || game.shuffleLeft <= 0,
								onClick: () => {
									sfxShuffle();
									apply(shuffleBoard(game), "洗牌");
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerBtn, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, { className: "size-4" }),
								label: "移出",
								count: game.removeLeft,
								disabled: game.status !== "playing" || game.removeLeft <= 0 || game.slot.length === 0 || game.holding.length >= 3,
								onClick: () => {
									sfxUi();
									apply(removeFromSlot(game));
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PowerBtn, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, { className: "size-4" }),
								label: "提示",
								disabled: game.status !== "playing",
								onClick: () => {
									sfxUi();
									setHint(hintIds(game));
								}
							})
						]
					})]
				})
			}),
			overlay ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-center justify-center bg-ink/35 px-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "panel w-full max-w-sm rounded-xl p-6 text-center",
					children: [
						game.status === "won" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/sheep.png",
								alt: "",
								className: "mx-auto h-20 w-20 object-contain"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-2 text-3xl text-ink",
								children: "恭喜过关"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted",
								children: [
									"消除 ",
									game.matches,
									" 组 · 下一关更密一点"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-col gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-12 rounded-xl bg-accent font-semibold text-accent-fg active:scale-[0.98]",
									onClick: () => startLevel(game.levelId + 1),
									children: "下一关"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-11 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line",
									onClick: () => {
										persistProgress({
											...game,
											status: "won"
										}, { inProgress: null });
										setScreen("title");
										setGame(null);
									},
									children: "返回首页"
								})]
							})
						] }) : null,
						game.status === "lost" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-3xl text-ink",
								children: "槽位满了"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "槽位只有 7 格。移出或复活还能再试。"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-col gap-2",
								children: [
									game.reviveLeft > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-12 rounded-xl bg-accent font-semibold text-accent-fg active:scale-[0.98]",
										onClick: () => {
											sfxUi();
											apply(revive(game), "复活");
										},
										children: "复活一次"
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line",
										onClick: () => startLevel(game.levelId),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "重开本关"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "inline-flex h-11 items-center justify-center gap-2 text-sm font-medium text-muted",
										onClick: () => {
											setScreen("title");
											setGame(null);
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "size-4" }), "返回首页"]
									})
								]
							})
						] }) : null,
						paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-3xl text-ink",
								children: "暂停"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: level.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-col gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-fg",
										onClick: () => {
											sfxUi();
											setGame({
												...game,
												status: "playing"
											});
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "继续"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line",
										onClick: () => startLevel(game.levelId),
										children: "重开本关"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 text-sm font-medium text-muted",
										onClick: toggleSound,
										children: save.sound ? "关闭音效" : "开启音效"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 text-sm font-medium text-muted",
										onClick: () => {
											persistProgress({
												...game,
												status: "playing"
											});
											setScreen("title");
											setGame(null);
										},
										children: "返回首页"
									})
								]
							})
						] }) : null
					]
				})
			}) : null
		]
	});
}
function PowerBtn({ icon, label, count, disabled, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled,
		onClick,
		className: "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md bg-accent-soft text-ink ring-1 ring-line transition-transform duration-150 active:scale-[0.98] disabled:opacity-40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-1 text-sm font-medium",
			children: [icon, label]
		}), typeof count === "number" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-xs tabular-nums text-muted",
			children: ["×", count]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-muted",
			children: "高亮可点"
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { Home as component };
