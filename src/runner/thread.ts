import { Script } from "@/runner/script";
import { Sprite } from "@/runner/sprite";
import { StackFrame } from "./stackFrame";

export class Thread {
  target: Sprite;
  script: Script;
  stack: StackFrame[] = [];
  status: "running" | "waiting" | "done" = "running";
  count = 0;
  waitUntil = 0;
  constructor(target: Sprite, script: Script) {
    this.target = target;
    this.script = script;
  }

  addFrame(frame: StackFrame) {
    this.stack.push(frame);
  }

  popFrame(): StackFrame | undefined {
    return this.stack.pop();
  }

  currentFrame(): StackFrame | undefined {
    return this.stack[this.stack.length - 1];
  }
}
