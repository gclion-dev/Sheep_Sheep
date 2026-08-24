import { TILE_KINDS } from "@/game/tiles";
import { cn } from "@/lib/utils";

export function TileFace({
  type,
  className,
  blocked,
  hint,
  shake,
}: {
  type: number;
  className?: string;
  blocked?: boolean;
  hint?: boolean;
  shake?: boolean;
}) {
  const kind = TILE_KINDS[type] ?? TILE_KINDS[0]!;
  return (
    <div
      className={cn("tile-card relative h-full w-full", shake && "shake", className)}
      data-blocked={blocked ? "true" : "false"}
      data-free={blocked ? "false" : "true"}
      data-hint={hint ? "true" : "false"}
    >
      <img
        src={kind.src}
        alt={kind.name}
        draggable={false}
        className="pointer-events-none h-full w-full object-contain p-[9%]"
      />
    </div>
  );
}
