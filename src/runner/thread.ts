import { Script } from "@/runner/script";
import { Sprite } from "@/runner/sprite";
import { StackFrame } from "./stackFrame";

export class Thread {
  target: Sprite;
  script: Script;
  executionStack: StackFrame[] = []; // which sub-areas of the code are currently being executed
  status: "running" | "waiting" | "done" | "bubbling" = "running";
  count = 0;
  waitUntil = 0;
  blockedBySprite: boolean = false;
  constructor(target: Sprite, script: Script) {
    this.target = target;
    this.script = script;
  }

  addFrame(frame: StackFrame) {
    this.executionStack.push(frame);
  }

  popFrame(): StackFrame | undefined {
    return this.executionStack.pop();
  }

  currentFrame(): StackFrame | undefined {
    return this.executionStack[this.executionStack.length - 1];
  }
}
