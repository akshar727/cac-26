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

    const background = document.getElementById(
      "backgroundCanvas",
    ) as HTMLCanvasElement;

    const backgroundContext = background.getContext("2d");

    backgroundContext?.clearRect(0, 0, background.width, background.height);

    for (const target of targets) {
      let contextToUse: CanvasRenderingContext2D | null = null;

      if (target.isBackdrop) {
        contextToUse = backgroundContext;
      } else {
        contextToUse = foregroundContext;
      }

      if (!contextToUse) {
        console.error("Could not get 2D context from canvas");
        return;
      }

      if (target.visible) {
        const costume = target._costumes[target.currentCostumeIndex];

        if (target.isBackdrop) {
          if (costume.complete && costume.naturalWidth > 0) {
            contextToUse.drawImage(
              costume,
              0,
              0,
              background.width,
              background.height,
            );
          }
          continue;
        }

        const scale = target.size / 100;

        contextToUse.save();

        contextToUse.translate(target.x, 600 - target.y);

        contextToUse.rotate(((target.direction - 90) * Math.PI) / 180);

        contextToUse.drawImage(
          costume,
          (-costume.width * scale) / 2,
          (-costume.height * scale) / 2,
          costume.width * scale,
          costume.height * scale,
        );

        contextToUse.restore();
        if (target.sayText || target.thinkText) {
          // console.log(
          //   "Rendering bubble for target",
          //   target.id,
          //   target.sayText,
          //   target.thinkText,
          // );
          const width = contextToUse.measureText(
            target.sayText || target.thinkText,
          ).width;
          let lines = [];
          // 25 chars / line
          const text = target.sayText || target.thinkText;
          for (let i = 0; i < text.length; i += 25) {
            lines.push(text.slice(i, i + 25));
          }
          let paddingX = 10;
          let paddingY = 10;
          const bubbleWidth = Math.max(width + paddingX * 2, 50);
          const bubbleHeight = lines.length * 20 + paddingY * 2;
          const bubbleX = target.x - bubbleWidth / 2;
          const bubbleY =
            600 - target.y - (costume.height * scale) / 2 - bubbleHeight - 10;

          contextToUse.beginPath();
          contextToUse.fillStyle = "white";
          contextToUse.strokeStyle = "gray";
          contextToUse.roundRect(
            bubbleX,
            bubbleY,
            bubbleWidth,
            bubbleHeight,
            10,
          );
          contextToUse.fill();
          contextToUse.stroke();
          contextToUse.beginPath();
          contextToUse.moveTo(target.x - 8, bubbleY + bubbleHeight);
          contextToUse.lineTo(target.x, bubbleY + bubbleHeight + 10);
          contextToUse.lineTo(target.x + 8, bubbleY + bubbleHeight);
          contextToUse.closePath();
          contextToUse.fill();
          contextToUse.stroke();
          // console.log("lines", lines);
          contextToUse.fillStyle = "black";
          contextToUse.textBaseline = "top";
          contextToUse.font = "16px Arial";
          for (let i = 0; i < lines.length; i++) {
            contextToUse.fillText(
              lines[i],
              bubbleX + paddingX,
              bubbleY + paddingY + i * 20,
            );
          }
        }
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

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (!mask[y][x]) {
          continue;
        }

        const localX = (x - costume.width / 2) * scale;

        const localY = (y - costume.height / 2) * scale;

        const worldX = localX * cosine - localY * sine + sprite.x;

        const worldY = localX * sine + localY * cosine + sprite.y;

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

    const bottom = Math.ceil(Math.max(aBounds.bottom, bBounds.bottom));

    const top = Math.floor(Math.min(aBounds.top, bBounds.top));

    if (left > right || bottom > top) {
      return false;
    }

    for (let worldY = bottom; worldY <= top; worldY++) {
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

    const relativeX = worldX - sprite.x;

    const relativeY = worldY - sprite.y;

    const angle = ((sprite.direction - 90) * Math.PI) / 180;

    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    const localX = relativeX * cosine + relativeY * sine;

    const localY = -relativeX * sine + relativeY * cosine;

    return {
      x: Math.floor(localX / scale + costume.width / 2),
      y: Math.floor(localY / scale + costume.height / 2),
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

    const angle = ((sprite.direction - 90) * Math.PI) / 180;

    const cosine = Math.abs(Math.cos(angle));

    const sine = Math.abs(Math.sin(angle));

    const boundsWidth = width * cosine + height * sine;

    const boundsHeight = width * sine + height * cosine;

    return {
      left: sprite.x - boundsWidth / 2,

      right: sprite.x + boundsWidth / 2,

      bottom: sprite.y - boundsHeight / 2,

      top: sprite.y + boundsHeight / 2,
    };
  }
}
