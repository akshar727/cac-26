import type { Sprite } from "@/runner/sprite";
import type { DatabaseBackdrop, DatabaseSprite } from "@/types/database";

export type StageSprites = (DatabaseSprite | DatabaseBackdrop)[];

export function spriteLabel(target: Sprite, sprites: StageSprites): string {
  if (target.isBackdrop) return "Backdrop";
  const sourceId = target.cloneSourceId ?? target.id;
  const source = sprites.find(
    (sprite) => !("isBackdrop" in sprite) && sprite.id === sourceId,
  );
  const name = source ? source.name : "Sprite";
  return target.cloneSourceId !== null ? `${name} (clone)` : name;
}

export function variableLabel(id: string, sprites: StageSprites): string {
  return (
    sprites
      .flatMap((sprite) => sprite.variables_map)
      .find((variable) => variable.id === id)?.name ?? "A variable"
  );
}
