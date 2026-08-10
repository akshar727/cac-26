import { Block } from "@/types/block";
import { Runtime } from "./runtime";
import { Thread } from "./thread";

export class VirtualMachine {
  step(thread: Thread, runtime: Runtime, deltaTime: number) {
    if (thread.count >= thread.script.blocks.length) {
      console.log("Thread completed:", thread);
      thread.status = "done";
      return;
    }
    if (thread.status === "waiting") {
      thread.waitTime -= deltaTime;
      if (thread.waitTime <= 0) {
        thread.status = "running";
      } else {
        return;
      }
    }
    let blockToExecute = thread.script.blocks[thread.count];
    console.log("Executing block:", blockToExecute);
    switch (blockToExecute.type) {
      case "set_position":
        thread.target.x = blockToExecute.x;
        thread.target.y = blockToExecute.y;
        break;
      case "set_x":
        thread.target.x = blockToExecute.x;
        break;
      case "set_y":
        thread.target.y = blockToExecute.y;
        break;
      case "wait":
        thread.status = "waiting";
        thread.waitTime = blockToExecute.duration;
        break;
      default:
        console.warn("Unknown block type:", blockToExecute.type);
        break;
    }
    thread.count++;
  }
}
