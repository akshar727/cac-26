import { Procedure } from "@/types/field";

export class Sprite {
  id: number = 0;
  x = 0;
  y = 0;
  direction = 90;
  size = 100;
  visible = true;
  variables = new Map<string, number | string | boolean>();
  borrowedVariables = new Map<string, number>();
  procedures = new Map<string, Procedure>();
  _costumes: HTMLImageElement[] = [];
  currentCostumeIndex = 0;

  constructor(
    imagePaths: { costumeName: string; loadablePath: string }[] = [],
  ) {
    for (const path of imagePaths) {
      const img = new Image();
      img.src = path.loadablePath;
      this._costumes.push(img);
    }
    this.currentCostumeIndex = 0;
  }
}
