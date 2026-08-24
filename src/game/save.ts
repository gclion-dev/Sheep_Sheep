import type { PersistV1 } from "./types";

const KEY = "sheep-stack-save-v1";
const VERSION = 1 as const;

export const defaults: PersistV1 = {
  version: VERSION,
  highestLevel: 1,
  lastLevel: 1,
  sound: true,
  reducedFx: false,
  gamesWon: 0,
  inProgress: null,
};

export function loadSave(): PersistV1 {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<PersistV1>;
    if (parsed.version !== VERSION) return { ...defaults };
    return {
      ...defaults,
      ...parsed,
      version: VERSION,
      inProgress: parsed.inProgress ?? null,
    };
  } catch {
    return { ...defaults };
  }
}

export function writeSave(next: PersistV1): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function patchSave(partial: Partial<PersistV1>): PersistV1 {
  const next = { ...loadSave(), ...partial, version: VERSION };
  writeSave(next);
  return next;
}
