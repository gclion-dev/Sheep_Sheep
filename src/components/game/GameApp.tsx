import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Home,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Undo2,
  Volume2,
  VolumeX,
  ArrowDownToLine,
} from "lucide-react";
import {
  createGame,
  hintIds,
  pickTile,
  remainingCount,
  removeFromSlot,
  revive,
  shuffleBoard,
  undoMove,
} from "@/game/engine";
import { boardBounds, isTileFree } from "@/game/generate";
import { getLevel } from "@/game/levels";
import { loadSave, patchSave, defaults } from "@/game/save";
import { TILE_KINDS } from "@/game/tiles";
import type { GameState, PersistV1, Tile } from "@/game/types";
import { SLOT_SIZE } from "@/game/types";
import {
  setSoundEnabled,
  sfxBlocked,
  sfxLose,
  sfxMatch,
  sfxPick,
  sfxShuffle,
  sfxUi,
  sfxWin,
  unlockAudio,
} from "@/game/audio";
import { TileFace } from "./TileFace";

type Screen = "title" | "play";

function persistProgress(game: GameState, extra: Partial<PersistV1> = {}) {
  const prev = loadSave();
  const reached = game.status === "won" ? game.levelId + 1 : game.levelId;
  patchSave({
    lastLevel: game.levelId,
    highestLevel: Math.max(prev.highestLevel, reached),
    inProgress:
      game.status === "won"
        ? null
        : {
            levelId: game.levelId,
            seed: game.seed,
            tiles: game.tiles,
            slot: game.slot,
            holding: game.holding,
            undoLeft: game.undoLeft,
            shuffleLeft: game.shuffleLeft,
            removeLeft: game.removeLeft,
            reviveLeft: game.reviveLeft,
            matches: game.matches,
          },
    ...extra,
  });
}

export function GameApp() {
  const [save, setSave] = useState<PersistV1>(defaults);
  const [screen, setScreen] = useState<Screen>("title");
  const [game, setGame] = useState<GameState | null>(null);
  const [hint, setHint] = useState<string[]>([]);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const boardWrap = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);

  useEffect(() => {
    const s = loadSave();
    setSave(s);
    setSoundEnabled(s.sound);
    for (const k of TILE_KINDS) {
      const img = new Image();
      img.src = k.src;
    }
  }, []);

  useEffect(() => {
    setSoundEnabled(save.sound);
  }, [save.sound]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && game?.status === "playing") persistProgress(game);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [game]);

  const startLevel = useCallback((levelId: number) => {
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

  const resumeRun = useCallback(() => {
    const fresh = loadSave();
    if (!fresh.inProgress) return;
    unlockAudio();
    sfxUi();
    const p = fresh.inProgress;
    setGame({
      status: p.slot.length >= SLOT_SIZE ? "lost" : "playing",
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
      lastMatchAt: 0,
    });
    setScreen("play");
    setHint([]);
  }, []);

  const apply = useCallback((next: GameState, note?: string) => {
    setGame(next);
    setHint([]);
    if (next.status === "won") {
      const prev = loadSave();
      persistProgress(next, { gamesWon: prev.gamesWon + 1 });
      sfxWin();
    } else {
      persistProgress(next);
      if (next.status === "lost") sfxLose();
    }
    setSave(loadSave());
    if (note) {
      setBanner(note);
      window.setTimeout(() => setBanner((b) => (b === note ? null : b)), 900);
    }
  }, []);

  const onPick = (tile: Tile) => {
    if (!game || game.status !== "playing") return;
    const result = pickTile(game, tile.id);
    if (!result.ok) {
      if (result.reason === "blocked") {
        sfxBlocked();
        setShakeId(tile.id);
        window.setTimeout(() => setShakeId((id) => (id === tile.id ? null : id)), 280);
      }
      return;
    }
    sfxPick();
    if (result.matched.length) {
      sfxMatch(result.state.combo);
      apply(result.state, result.state.combo > 1 ? `连消 ×${result.state.combo}` : "消除");
    } else {
      apply(result.state);
    }
  };

  const level = game ? getLevel(game.levelId) : getLevel(1);
  const remaining = game ? remainingCount(game) : 0;
  const allTiles = game ? game.tiles : [];
  const bounds = useMemo(() => boardBounds(allTiles), [allTiles]);

  useEffect(() => {
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
  }, [game, bounds.maxX, bounds.minX, bounds.maxY, bounds.minY, allTiles.length]);

  const toggleSound = () => {
    const next = patchSave({ sound: !save.sound });
    setSave(next);
    setSoundEnabled(next.sound);
    unlockAudio();
    sfxUi();
  };

  if (screen === "title" || !game) {
    return (
      <main className="title-shell flex flex-col">
        <header className="title-banner relative shrink-0">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/45 to-transparent" />
          <div className="absolute inset-0 flex items-center px-5 sm:px-8">
            <div>
              <p className="text-xs font-medium tracking-wide text-accent sm:text-sm">三消叠叠乐</p>
              <h1 className="text-4xl leading-none text-ink sm:text-5xl">羊了个羊</h1>
            </div>
          </div>
        </header>

        <div
          className="title-cover relative min-h-0 flex-1"
          role="img"
          aria-label="小羊站在胡萝卜、四叶草、毛线和苹果牌上"
        />

        <section className="relative z-10 px-4 pt-3">
          <div className="panel mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-xl px-5 py-4">
            <p className="text-center text-sm text-muted">点开没被压住的牌，三个相同即可消除</p>
            <button
              type="button"
              onClick={() => startLevel(Math.min(save.highestLevel, 99) || 1)}
              className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg shadow-sm transition-transform duration-150 active:scale-[0.98]"
            >
              开始游戏
            </button>
            {save.inProgress ? (
              <button
                type="button"
                onClick={resumeRun}
                className="h-12 w-full rounded-xl bg-surface text-base font-medium text-ink shadow-sm ring-1 ring-line transition-transform duration-150 active:scale-[0.98]"
              >
                继续第 {save.inProgress.levelId} 关
              </button>
            ) : null}
            <p className="tabular-nums text-sm text-muted">
              最高到达第 {save.highestLevel} 关 · 通关 {save.gamesWon} 次
            </p>
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setHelpOpen((v) => !v)}
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {helpOpen ? "收起玩法" : "怎么玩"}
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink ring-1 ring-line"
                aria-label={save.sound ? "关闭音效" : "开启音效"}
              >
                {save.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                {save.sound ? "音效开" : "音效关"}
              </button>
            </div>
            {helpOpen ? (
              <ol className="w-full text-sm text-ink">
                <li className="py-1">1. 只能点最上面、没有被压住的牌。</li>
                <li className="py-1">2. 牌会进入下方 7 格槽位，相同的会靠在一起。</li>
                <li className="py-1">3. 三个相同就会消除。全部消完过关。</li>
                <li className="py-1">4. 槽位满了失败。撤回、洗牌、移出能解围。</li>
              </ol>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  const unit = 58;
  const bw = Math.max(1, bounds.maxX - bounds.minX) * unit;
  const bh = Math.max(1, bounds.maxY - bounds.minY) * unit;
  const paused = game.status === "paused";
  const overlay = game.status === "won" || game.status === "lost" || paused;

  return (
    <main className="meadow-shell relative flex h-svh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-lg items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-line"
          onClick={() => {
            sfxUi();
            persistProgress(game);
            setGame({ ...game, status: "paused" });
          }}
          aria-label="暂停"
        >
          <Pause className="size-4" />
        </button>
        <div className="min-w-0 flex-1 rounded-xl bg-surface/90 px-3 py-2 ring-1 ring-line">
          <p className="truncate font-display text-base leading-tight text-ink">
            第 {game.levelId} 关 · {level.name}
          </p>
          <p className="truncate text-xs text-muted">{level.hint}</p>
        </div>
        <div className="rounded-xl bg-surface/90 px-3 py-2 text-right ring-1 ring-line">
          <p className="text-xs text-muted">剩余</p>
          <p className="font-display text-lg leading-none tabular-nums text-ink">{remaining}</p>
        </div>
      </header>

      <div ref={boardWrap} className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center justify-center px-2">
        {allTiles.length === 0 ? (
          <p className="text-sm text-muted">槽位里的牌消完就过关</p>
        ) : (
          <div
            className="relative"
            style={{
              width: bw * boardScale,
              height: bh * boardScale,
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: bw, height: bh, transform: `scale(${boardScale})` }}
            >
              {allTiles
                .slice()
                .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x)
                .map((tile) => {
                  const free = isTileFree(tile, allTiles);
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className="absolute p-0"
                      style={{
                        left: (tile.x - bounds.minX) * unit,
                        top: (tile.y - bounds.minY) * unit,
                        width: unit - 4,
                        height: unit - 4,
                        zIndex: tile.z * 40 + Math.round(tile.y * 8),
                      }}
                      disabled={!free || game.status !== "playing"}
                      onClick={() => onPick(tile)}
                      aria-label={free ? "可点" : "被压住"}
                    >
                      <TileFace type={tile.type} blocked={!free} hint={hint.includes(tile.id)} shake={shakeId === tile.id} />
                    </button>
                  );
                })}
            </div>
          </div>
        )}
        {banner ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="pop-in rounded-full bg-accent px-4 py-1.5 font-display text-lg text-accent-fg shadow-md">
              {banner}
            </span>
          </div>
        ) : null}
      </div>

      {game.holding.length > 0 ? (
        <div className="mx-auto flex w-full max-w-lg justify-center gap-2 px-3 pb-1">
          {game.holding.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className="size-14 p-0"
              onClick={() => onPick(tile)}
              aria-label="移出区"
            >
              <TileFace type={tile.type} />
            </button>
          ))}
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-lg px-3 pb-3">
        <div className="rounded-xl bg-surface/95 p-3 shadow-sm ring-1 ring-line">
          <div className="mb-3 grid grid-cols-7 gap-1.5">
            {Array.from({ length: SLOT_SIZE }, (_, i) => {
              const tile = game.slot[i];
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm bg-slot ring-1 ring-line"
                >
                  {tile ? <TileFace type={tile.type} className="pop-in" /> : null}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <PowerBtn
              icon={<Undo2 className="size-4" />}
              label="撤回"
              count={game.undoLeft}
              disabled={game.status !== "playing" || game.undoLeft <= 0 || game.history.length === 0}
              onClick={() => {
                sfxUi();
                apply(undoMove(game));
              }}
            />
            <PowerBtn
              icon={<Shuffle className="size-4" />}
              label="洗牌"
              count={game.shuffleLeft}
              disabled={game.status !== "playing" || game.shuffleLeft <= 0}
              onClick={() => {
                sfxShuffle();
                apply(shuffleBoard(game), "洗牌");
              }}
            />
            <PowerBtn
              icon={<ArrowDownToLine className="size-4" />}
              label="移出"
              count={game.removeLeft}
              disabled={game.status !== "playing" || game.removeLeft <= 0 || game.slot.length === 0 || game.holding.length >= 3}
              onClick={() => {
                sfxUi();
                apply(removeFromSlot(game));
              }}
            />
            <PowerBtn
              icon={<Lightbulb className="size-4" />}
              label="提示"
              disabled={game.status !== "playing"}
              onClick={() => {
                sfxUi();
                setHint(hintIds(game));
              }}
            />
          </div>
        </div>
      </section>

      {overlay ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/35 px-5">
          <div className="panel w-full max-w-sm rounded-xl p-6 text-center">
            {game.status === "won" ? (
              <>
                <img src="/game/sheep.png" alt="" className="mx-auto h-20 w-20 object-contain" />
                <h2 className="mt-2 text-3xl text-ink">恭喜过关</h2>
                <p className="mt-1 text-sm text-muted">消除 {game.matches} 组 · 下一关更密一点</p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    className="h-12 rounded-xl bg-accent font-semibold text-accent-fg active:scale-[0.98]"
                    onClick={() => startLevel(game.levelId + 1)}
                  >
                    下一关
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line"
                    onClick={() => {
                      persistProgress({ ...game, status: "won" }, { inProgress: null });
                      setScreen("title");
                      setGame(null);
                    }}
                  >
                    返回首页
                  </button>
                </div>
              </>
            ) : null}
            {game.status === "lost" ? (
              <>
                <h2 className="text-3xl text-ink">槽位满了</h2>
                <p className="mt-1 text-sm text-muted">槽位只有 7 格。移出或复活还能再试。</p>
                <div className="mt-5 flex flex-col gap-2">
                  {game.reviveLeft > 0 ? (
                    <button
                      type="button"
                      className="h-12 rounded-xl bg-accent font-semibold text-accent-fg active:scale-[0.98]"
                      onClick={() => {
                        sfxUi();
                        apply(revive(game), "复活");
                      }}
                    >
                      复活一次
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line"
                    onClick={() => startLevel(game.levelId)}
                  >
                    <RotateCcw className="size-4" />
                    重开本关
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 text-sm font-medium text-muted"
                    onClick={() => {
                      setScreen("title");
                      setGame(null);
                    }}
                  >
                    <Home className="size-4" />
                    返回首页
                  </button>
                </div>
              </>
            ) : null}
            {paused ? (
              <>
                <h2 className="text-3xl text-ink">暂停</h2>
                <p className="mt-1 text-sm text-muted">{level.name}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-fg"
                    onClick={() => {
                      sfxUi();
                      setGame({ ...game, status: "playing" });
                    }}
                  >
                    <Play className="size-4" />
                    继续
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-surface-2 font-medium text-ink ring-1 ring-line"
                    onClick={() => startLevel(game.levelId)}
                  >
                    重开本关
                  </button>
                  <button
                    type="button"
                    className="h-11 text-sm font-medium text-muted"
                    onClick={toggleSound}
                  >
                    {save.sound ? "关闭音效" : "开启音效"}
                  </button>
                  <button
                    type="button"
                    className="h-11 text-sm font-medium text-muted"
                    onClick={() => {
                      persistProgress({ ...game, status: "playing" });
                      setScreen("title");
                      setGame(null);
                    }}
                  >
                    返回首页
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PowerBtn({
  icon,
  label,
  count,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-md bg-accent-soft text-ink ring-1 ring-line transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
    >
      <span className="flex items-center gap-1 text-sm font-medium">
        {icon}
        {label}
      </span>
      {typeof count === "number" ? (
        <span className="text-xs tabular-nums text-muted">×{count}</span>
      ) : (
        <span className="text-xs text-muted">高亮可点</span>
      )}
    </button>
  );
}
