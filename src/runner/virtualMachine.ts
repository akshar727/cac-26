import { Runtime } from "./runtime";
import { Thread } from "./thread";
import {
  IfFrame,
  ProcedureFrameNoReturn,
  ProcedureFrameReturn,
  RepeatFrame,
} from "./stackFrame";
import { Block } from "../types/block";
import { EvaluationEngine} from "./evaluationEngine";
import { Procedure } from "@/types/field";

export class VirtualMachine {
  _processingThread: Thread | null = null;
  _evaluator: EvaluationEngine;
  // private nextEvaluationId = 1;
  constructor() {
    this._evaluator = new EvaluationEngine();
  }
  step(thread: Thread, _: Runtime, currentTime: number) {
    this._processingThread = thread;
    if (thread.status === "waiting") {
      if (currentTime < thread.waitUntil) {
        this._processingThread = null;
        return;
      }

      thread.status = "running";
    }

    const MAX_OPERATIONS = 1000;
    let operations = 0;

    while (thread.status === "running" && operations < MAX_OPERATIONS) {
      operations++;
      if (
        thread.stack.length === 0 &&
        thread.count >= thread.script.blocks.length
      ) {
        thread.status = "done";
        console.log(
          "Thread completed for target:",
          thread.target,
          "program counter:",
          thread.count,
        );
        this._processingThread = null;
        return;
      }

      let blockToExecute = null;

      if (thread.stack.length > 0) {
        console.log(
          "Current stack for target",
          thread.target.id,
          ":",
          JSON.parse(JSON.stringify(thread.stack)),
        );
        const currentFrame = thread.currentFrame();
        if (currentFrame) {
          if (currentFrame.isComplete()) {
            console.log(
              "Current frame is complete, popping frame from stack for target:",
              thread.target.id,
            );
            thread.popFrame();
            if (thread.stack.length === 0) {
              thread.count++;
            }
            continue;
          }

          console.log(
            "Current frame",
            JSON.parse(JSON.stringify(currentFrame)),
          );
          blockToExecute = currentFrame._body[currentFrame._position];
          console.log("Block to execute in current frame:", blockToExecute);
          currentFrame._position++;
          if (currentFrame._position === currentFrame._body.length) {
            if (currentFrame instanceof RepeatFrame) {
              currentFrame.incrementCount();
              if (currentFrame.hasMoreIterations()) {
                currentFrame._position = 0;
              } else {
                currentFrame.markComplete();
                if (thread.target.id === 6) {
                  console.log(
                    "Marking Repeat frame complete after reaching end of body for target 6",
                  );
                }
              }
            } else if (currentFrame instanceof IfFrame) {
              currentFrame.markComplete();
            } else if (currentFrame instanceof ProcedureFrameNoReturn) {
              console.log(
                "Marking Procedure frame complete after reaching end of body for procedure:",
                currentFrame._procedure.name,
              );
              currentFrame.markComplete();
            }
          }
        }
      }

      if (
        thread.stack.length === 0 &&
        (blockToExecute === null || blockToExecute === undefined)
      ) {
        blockToExecute = thread.script.blocks[thread.count];
      }

      if (!blockToExecute) {
        thread.status = "done";
        console.warn(
          "No block to execute and stack is empty. Marking thread as done for target:",
          thread.target.id,
        );
        console.warn(
          "Thread state:",
          thread,
          "Current count:",
          thread.count,
          "Length of blocks:",
          thread.script.blocks.length,
          "Stack",
          thread.stack,
        );
        this._processingThread = null;
        return;
      }
      if (thread.target.id === 6) {
        console.log(
          "Executing block of type",
          blockToExecute.type,
          "for target",
          thread.target.id,
        );
      }
      this.executeBlock(blockToExecute, thread, currentTime);

      if (thread.stack.length === 0) {
        thread.count++;
        if (thread.target.id === 6) {
          console.log("Thread count incremented to:", thread.count);
          //   console.log(thread.target);
        }
      }
    }

    this._processingThread = null;
  }

  executeBlock(blockToExecute: Block, thread: Thread, currentTime: number) {
    switch (blockToExecute.type) {
      case "screen_set_position": {
        let targetX = this._evaluator.evaluate(blockToExecute.x,thread) as number;
        let targetY = this._evaluator.evaluate(blockToExecute.y,thread) as number;
        thread.target.x = targetX as number;
        thread.target.y = targetY as number;
        break;
      }

      case "screen_set_x": {
        let targetX = this._evaluator.evaluate(blockToExecute.x,thread) as number;
        thread.target.x = targetX as number;
        break;
      }
      case "screen_set_y": {
        let targetY = this._evaluator.evaluate(blockToExecute.y,thread) as number;
        thread.target.y = targetY as number;
        break;
      }

      case "logic_wait": {
        thread.status = "waiting";
        thread.waitUntil =
          currentTime +
          (this._evaluator.evaluate(blockToExecute.duration,thread) as number) * 1000;
        this._processingThread = null;
        return;
      }
      case "variables_set": {
        const variableName = blockToExecute.name;

        let currentValue = thread.target.variables.get(variableName);
        if (currentValue === undefined) {
          // check in the last procedure frame if it exists
          const filteredStack = thread.stack.filter(
            (frame) => frame instanceof ProcedureFrameNoReturn,
          );
          if (filteredStack.length > 0) {
            const lastProcedureFrame = filteredStack[
              filteredStack.length - 1
            ] as ProcedureFrameNoReturn;
            const arg = lastProcedureFrame._arguments.find(
              (arg) => arg.name === variableName,
            );
            if (arg) {
              arg.value = this._evaluator.evaluate(blockToExecute.value,thread) as number;
              break;
            }
          }
          console.error(
            `Variable ${variableName} is not defined for target ${thread.target.id} and not found in procedure frame arguments.`,
          );
        } else {
          thread.target.variables.set(
            variableName,
            this._evaluator.evaluate(blockToExecute.value,thread) as number,
          );
        }
        break;
      }

      case "math_change": {
        const variableName = blockToExecute.name;
        const changeValue = this._evaluator.evaluate(blockToExecute.value,thread) as number;
        let currentValue = thread.target.variables.get(variableName);
        if (currentValue === undefined) {
          // check in the last procedure frame if it exists
          const filteredStack = thread.stack.filter(
            (frame) => frame instanceof ProcedureFrameNoReturn,
          );
          if (filteredStack.length > 0) {
            const lastProcedureFrame = filteredStack[
              filteredStack.length - 1
            ] as ProcedureFrameNoReturn;
            const arg = lastProcedureFrame._arguments.find(
              (arg) => arg.name === variableName,
            );
            if (arg) {
              if (
                typeof arg.value === "number" &&
                typeof changeValue === "number"
              ) {
                arg.value += changeValue;
              } else {
                console.error(
                  `Argument ${variableName} is not a number and cannot be changed. Value: ${arg.value}`,
                );
              }
            }
          }
        } else {
          if (typeof currentValue === "number") {
            thread.target.variables.set(
              variableName,
              currentValue + (changeValue as number),
            );
          } else {
            console.error(
              `Variable ${variableName} is not a number and cannot be changed. Value: ${currentValue}`,
            );
          }
        }
        break;
      }

      case "controls_repeat_ext": {
        let times = this._evaluator.evaluate(blockToExecute.times,thread) as number;
        if ((times as number) > 0 && blockToExecute.body.length > 0) {
          const repeatFrame = new RepeatFrame(
            times as number,
            blockToExecute.body,
          );

          thread.addFrame(repeatFrame);
        }
        break;
      }
      case "controls_if": {
        let conditionMet = false;
        let n = 0;

        do {
          const conditionKey = "condition" + n;
          const thenBodyKey = "thenBody" + n;

          if (
            blockToExecute.hasOwnProperty(conditionKey) &&
            blockToExecute.hasOwnProperty(thenBodyKey)
          ) {
            //@ts-expect-error
            const condition = blockToExecute[conditionKey] as Condition;
            //@ts-expect-error
            const thenBody = blockToExecute[thenBodyKey] as Block[];

            if (this._evaluator.evaluateCondition(condition,thread)) {
              thread.addFrame(new IfFrame(thenBody));
              conditionMet = true;
              break;
            }
          }
          n++;
        } while (blockToExecute.hasOwnProperty("condition" + n));

        if (!conditionMet && blockToExecute.hasOwnProperty("elseBody")) {
          //@ts-expect-error
          thread.addFrame(new IfFrame(blockToExecute.elseBody));
        }
        break;
      }
      case "procedures_callnoreturn": {
        const newFrame = new ProcedureFrameNoReturn(
          thread.target.procedures.get(blockToExecute.name) as Procedure,
          blockToExecute.arguments.map((arg) => ({
            name: arg.name,
            value: this._evaluator.evaluate(arg.value,thread) as number | string | boolean,
          })),
        );
        thread.addFrame(newFrame);
        break;
      }
      case "controls_flow_statements": {
        if (blockToExecute.flow === "BREAK") {
          while (thread.stack.length > 0) {
            // break out of the innermost loop only just like in actual programming languages
            // loop through the stack frames backwards to find the nearest RepeatFrame
            let foundRepeatFrame = false;
            for (let i = thread.stack.length - 1; i >= 0; i--) {
              if (thread.stack[i] instanceof RepeatFrame) {
                // Found the nearest RepeatFrame, pop it and break out of the loop
                thread.stack.splice(i, 1);
                foundRepeatFrame = true;
                break;
              }
            }
            if (foundRepeatFrame) {
              break; // Exit the while loop after breaking out of the innermost loop
            }
          }
        } else if (blockToExecute.flow === "CONTINUE") {
          // Similar to BREAK, but we just want to skip to the next iteration of the innermost loop
          for (let i = thread.stack.length - 1; i >= 0; i--) {
            if (thread.stack[i] instanceof RepeatFrame) {
              const repeatFrame = thread.stack[i] as RepeatFrame;
              repeatFrame.incrementCount();
              if (repeatFrame.hasMoreIterations()) {
                repeatFrame._position = 0; // Reset position to the start of the loop body
              } else {
                repeatFrame.markComplete(); // Mark the loop as complete if no more iterations
              }
              break;
            }
          }
        }
        break;
      }
      default:
        //@ts-ignore
        console.warn("Unknown block type:", blockToExecute.type);
        break;
    }
  }
}
