export class Sprite {
  id: number = 0;
  x = 0;
  y = 0;
  direction = 90;
  size = 100;
  visible = true;
  variables = new Map<string, number | string | boolean>();
  _costumes: HTMLImageElement[] = [];
  currentCostumeIndex = 0;

  constructor(imagePaths: string[] = []) {
    for (const path of imagePaths) {
      const img = new Image();
      img.src = path;
      this._costumes.push(img);
    }
    this.currentCostumeIndex = 0;
  }
}
