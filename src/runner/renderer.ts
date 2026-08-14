import { Sprite } from "@/runner/sprite";

export class Renderer {
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
        foregroundContext?.save();
        foregroundContext?.translate(
          target.x + target._costumes[target.currentCostumeIndex].width / 2,
          target.y + target._costumes[target.currentCostumeIndex].height / 2,
        );
        foregroundContext?.rotate(((target.direction - 90) * Math.PI) / 180);
        foregroundContext?.drawImage(
          target._costumes[target.currentCostumeIndex],
          -target._costumes[target.currentCostumeIndex].width / 2,
          -target._costumes[target.currentCostumeIndex].height / 2,
          target._costumes[target.currentCostumeIndex].width *
            (target.size / 100),
          target._costumes[target.currentCostumeIndex].height *
            (target.size / 100),
        );
        foregroundContext?.restore();
      }
    }
  }
}
