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
  _costumeAlphaMasks: Map<number, boolean[][]> = new Map();
  _costumes: HTMLImageElement[] = [];
  currentCostumeIndex = 0;
  sayText: string = "";
  thinkText: string = "";
  bubbleUntil: number = 0;
  isBackdrop: boolean = false;

  constructor(
    imagePaths: {
      costumeName: string;
      loadablePath: string;
      truePath: string | null;
    }[] = [],
    onImageLoaded?: () => void,
  ) {
    let i = 0;
    for (const path of imagePaths) {
      const index = i;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = path.loadablePath;
      img.onload = () => {
        this.makeAlphaMask(img, index);
        onImageLoaded?.();
        // console.log(
        //   `Alpha mask created for costume ${path.costumeName} of sprite ${this.id}`,
        // );
      };
      this._costumes.push(img);
      i++;
    }
    this.currentCostumeIndex = 0;
  }
  onEdge(): boolean {
    throw new Error("Method not implemented.");
  }
  makeAlphaMask(costume: HTMLImageElement, ind: number) {
    const width = costume.width;
    const height = costume.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context from canvas");
    }
    ctx.drawImage(costume, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const alphaMask: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      alphaMask[y] = [];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4 + 3;
        alphaMask[y][x] = imageData.data[index] > 0;
      }
    }
    this._costumeAlphaMasks.set(ind, alphaMask);
  }

  markSay(text: string, duration: number, currentTime: number) {
    this.sayText = String(text);
    console.log(`Sprite ${this.id} now marked as saying: ${text}`);
    this.bubbleUntil = currentTime + duration * 1000;
    // console.log(this.sayText, this.bubbleUntil, currentTime, duration);
  }

  markThink(text: string, duration: number, currentTime: number) {
    this.thinkText = String(text);
    this.bubbleUntil = currentTime + duration * 1000;
    // console.log(this.thinkText, this.bubbleUntil, currentTime, duration);
  }
  clearBubbles() {
    this.sayText = "";
    this.thinkText = "";
    this.bubbleUntil = 0;
  }
}
