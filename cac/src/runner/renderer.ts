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
        console.log(
          `Rendering sprite ${target.id} at position (${target.x}, ${target.y}). Current costume index: ${target.currentCostumeIndex}, Costume path: ${target._costumes[target.currentCostumeIndex]}`,
        );
        foregroundContext?.drawImage(
          target._costumes[target.currentCostumeIndex],
          target.x,
          target.y,
        );
      }
    }
  }
}
