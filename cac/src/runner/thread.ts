import { Script } from "@/runner/script";
import { Sprite } from "@/runner/sprite";

export class Thread {
  target: Sprite;
  script: Script;
  status: "running" | "waiting" | "done" = "running";
  count = 0;
  waitTime = 0;
  constructor(target: Sprite, script: Script) {
    this.target = target;
    this.script = script;
  }
}
