import { Sprite } from "@/runner/sprite";

export class Renderer {
  maskCache: {
    id: number;
    x: number;
    y: number;
    rotation: number;
    size: number;
    mask: boolean[][];
  }[] = [];
  blit(targets: Sprite[]) {
    const foregroundCanvas = document.getElementById(
      "foregroundCanvas",
    ) as HTMLCanvasElement;
    const foregroundContext = foregroundCanvas.getContext("2d");
    foregroundContext?.clearRect(
      0,
      0,
      foregroundCanvas.width,
      foregroundCanvas.height,
    );
    for (const target of targets) {
      if (target.visible) {
        const costume = target._costumes[target.currentCostumeIndex];
        const scale = target.size / 100;

        foregroundContext?.save();

        foregroundContext?.translate(target.x, target.y);

        foregroundContext?.rotate(((target.direction - 90) * Math.PI) / 180);

        foregroundContext?.drawImage(
          costume,
          (-costume.width * scale) / 2,
          (-costume.height * scale) / 2,
          costume.width * scale,
          costume.height * scale,
        );

        foregroundContext?.restore();
      }
    }
  }

  spriteTouchingEdge(
    sprite: Sprite,
    stageWidth: number,
    stageHeight: number,
  ): boolean {
    const costume = sprite._costumes[sprite.currentCostumeIndex];
    const mask = sprite._costumeAlphaMasks.get(sprite.currentCostumeIndex);

    if (!mask) {
      return false;
    }

    const scale = sprite.size / 100;

    if (scale <= 0) {
      return false;
    }

    const angle = ((sprite.direction - 90) * Math.PI) / 180;

    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    const centerX = sprite.x + (costume.width * scale) / 2;
    const centerY = sprite.y + (costume.height * scale) / 2;

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (!mask[y][x]) {
          continue;
        }

        const localX = (x - costume.width / 2) * scale;

        const localY = (y - costume.height / 2) * scale;

        const worldX = localX * cosine - localY * sine + centerX;

        const worldY = localX * sine + localY * cosine + centerY;

        if (
          worldX <= 0 ||
          worldX >= stageWidth ||
          worldY <= 0 ||
          worldY >= stageHeight
        ) {
          return true;
        }
      }
    }

    return false;
  }

  mouseTouchingSprite(sprite: Sprite, mouseX: number, mouseY: number): boolean {
    const mask = sprite._costumeAlphaMasks.get(sprite.currentCostumeIndex);

    if (!mask) {
      return false;
    }

    const pixel = this.worldToMask(sprite, mouseX, mouseY);

    if (!pixel) {
      return false;
    }

    if (
      pixel.x < 0 ||
      pixel.y < 0 ||
      pixel.y >= mask.length ||
      pixel.x >= mask[pixel.y].length
    ) {
      return false;
    }

    return mask[pixel.y][pixel.x];
  }

  spritesTouching(a: Sprite, b: Sprite): boolean {
    const aMask = a._costumeAlphaMasks.get(a.currentCostumeIndex);
    const bMask = b._costumeAlphaMasks.get(b.currentCostumeIndex);

    if (!aMask || !bMask) {
      return false;
    }

    const aBounds = this.getSpriteBounds(a);
    const bBounds = this.getSpriteBounds(b);

    const left = Math.ceil(Math.max(aBounds.left, bBounds.left));
    const right = Math.floor(Math.min(aBounds.right, bBounds.right));
    const top = Math.ceil(Math.max(aBounds.top, bBounds.top));
    const bottom = Math.floor(Math.min(aBounds.bottom, bBounds.bottom));

    if (left > right || top > bottom) {
      return false;
    }

    for (let worldY = top; worldY <= bottom; worldY++) {
      for (let worldX = left; worldX <= right; worldX++) {
        const aPixel = this.worldToMask(a, worldX, worldY);
        const bPixel = this.worldToMask(b, worldX, worldY);

        if (!aPixel || !bPixel) {
          continue;
        }

        if (
          aPixel.x >= 0 &&
          aPixel.y >= 0 &&
          aPixel.y < aMask.length &&
          aPixel.x < aMask[aPixel.y].length &&
          bPixel.x >= 0 &&
          bPixel.y >= 0 &&
          bPixel.y < bMask.length &&
          bPixel.x < bMask[bPixel.y].length &&
          aMask[aPixel.y][aPixel.x] &&
          bMask[bPixel.y][bPixel.x]
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private worldToMask(
    sprite: Sprite,
    worldX: number,
    worldY: number,
  ): { x: number; y: number } | null {
    const costume = sprite._costumes[sprite.currentCostumeIndex];

    const scale = sprite.size / 100;

    if (scale <= 0) {
      return null;
    }

    const centerX = sprite.x;
    const centerY = sprite.y;

    const relativeX = worldX - centerX;
    const relativeY = worldY - centerY;

    const angle = ((sprite.direction - 90) * Math.PI) / 180;

    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    const rotatedX = relativeX * cosine + relativeY * sine;

    const rotatedY = -relativeX * sine + relativeY * cosine;

    return {
      x: Math.floor(rotatedX / scale + costume.width / 2),
      y: Math.floor(rotatedY / scale + costume.height / 2),
    };
  }

  private getSpriteBounds(sprite: Sprite): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    const costume = sprite._costumes[sprite.currentCostumeIndex];

    const scale = sprite.size / 100;

    const width = costume.width * scale;
    const height = costume.height * scale;

    const centerX = sprite.x + width / 2;
    const centerY = sprite.y + height / 2;

    const angle = ((sprite.direction - 90) * Math.PI) / 180;

    const cosine = Math.abs(Math.cos(angle));
    const sine = Math.abs(Math.sin(angle));

    const boundsWidth = width * cosine + height * sine;

    const boundsHeight = width * sine + height * cosine;

    return {
      left: centerX - boundsWidth / 2,
      right: centerX + boundsWidth / 2,
      top: centerY - boundsHeight / 2,
      bottom: centerY + boundsHeight / 2,
    };
  }
}
