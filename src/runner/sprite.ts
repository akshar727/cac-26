import { Procedure } from "@/types/field";

const alphaMaskCache = new Map<string, boolean[][]>();

export class Sprite {
  id: number = 0;
  cloneSourceId: number | null = null;
  x = 0;
  y = 0;
  direction = 90;
  size = 100;
  visible = true;
  variables = new Map<string, number | string | boolean>();
  localVariableNames = new Set<string>();
  globalVariableNames = new Set<string>();
  borrowedVariables = new Map<string, number>();
  procedures = new Map<string, Procedure>();
  _costumeAlphaMasks: Map<number, boolean[][]> = new Map();
  _costumes: HTMLImageElement[] = [];
  currentCostumeIndex = 0;
  sayText: string = "";
  thinkText: string = "";
  bubbleUntil: number = 0;
  isBackdrop: boolean = false;

  static cloneOf(source: Sprite, id: number): Sprite {
    const clone = new Sprite();
    clone.id = id;
    clone.cloneSourceId = source.cloneSourceId ?? source.id;
    clone.x = source.x;
    clone.y = source.y;
    clone.direction = source.direction;
    clone.size = source.size;
    clone.visible = source.visible;
    clone.currentCostumeIndex = source.currentCostumeIndex;
    clone.isBackdrop = source.isBackdrop;
    clone._costumes = source._costumes;
    clone._costumeAlphaMasks = source._costumeAlphaMasks;
    clone.procedures = source.procedures;
    clone.localVariableNames = new Set(source.localVariableNames);
    clone.globalVariableNames = new Set(source.globalVariableNames);
    clone.borrowedVariables = new Map(source.borrowedVariables);

    for (const variableName of clone.localVariableNames) {
      const value = source.variables.get(variableName);
      if (value !== undefined) {
        clone.variables.set(variableName, value);
      }
    }
    for (const variableName of clone.globalVariableNames) {
      clone.borrowedVariables.set(variableName, source.id);
    }

    return clone;
  }

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
        const cached = alphaMaskCache.get(path.loadablePath);
        if (cached) {
          this._costumeAlphaMasks.set(index, cached);
        } else {
          this.makeAlphaMask(img, index, path.loadablePath);
        }
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
  makeAlphaMask(costume: HTMLImageElement, ind: number, cacheKey?: string) {
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
    if (cacheKey) alphaMaskCache.set(cacheKey, alphaMask);
  }

  markSay(text: string, duration: number, currentTime: number) {
    this.sayText = String(text);
    this.bubbleUntil = currentTime + duration * 1000;
  }

  markThink(text: string, duration: number, currentTime: number) {
    this.thinkText = String(text);
    this.bubbleUntil = currentTime + duration * 1000;
  }
  clearBubbles() {
    this.sayText = "";
    this.thinkText = "";
    this.bubbleUntil = 0;
  }
}
