import { Runtime } from "./runtime";
import { Thread } from "./thread";
import {
  ForFrame,
  IfFrame,
  ProcedureFrameNoReturn,
  RepeatFrame,
  RepeatWhileFrame,
} from "./stackFrame";
import { Block } from "../types/block";
import { EvaluationEngine } from "./evaluationEngine";
import { Procedure } from "@/types/field";

export class VirtualMachine {
  _evaluator: EvaluationEngine;
  constructor() {
    this._evaluator = new EvaluationEngine();
  }
  step(thread: Thread, _: Runtime, currentTime: number) {
    if (thread.status === "waiting") {
      if (currentTime < thread.waitUntil) {
        return;
      }

      thread.status = "running";
    }

    const MAX_OPERATIONS = 1000;
    let operations = 0;

    while (thread.status === "running" && operations < MAX_OPERATIONS) {
      operations++;
      if (
        thread.executionStack.length === 0 &&
        thread.count >= thread.script.blocks.length
      ) {
        thread.status = "done";
        console.log(
          "Thread completed for target:",
          thread.target,
          "program counter:",
          thread.count,
        );
        return;
      }

      let blockToExecute = null;

      if (thread.executionStack.length > 0) {
        // console.log(
        //   "Current stack for target",
        //   thread.target.id,
        //   ":",
        //   JSON.parse(JSON.stringify(thread.executionStack)),
        // );
        const currentFrame = thread.currentFrame();
        if (currentFrame) {
          if (currentFrame.isComplete()) {
            if (currentFrame instanceof ForFrame) {
              currentFrame._currentValue += currentFrame._stepValue;
              console.warn(
                "Current value after increment:",
                currentFrame._currentValue,
              );
              if (
                (currentFrame._stepValue > 0 &&
                  currentFrame._currentValue <= currentFrame._endValue) ||
                (currentFrame._stepValue < 0 &&
                  currentFrame._currentValue >= currentFrame._endValue)
              ) {
                currentFrame._position = 0;
                currentFrame._finished = false;
              } else {
                console.warn("Current value:", currentFrame._currentValue);
                thread.popFrame(); // so that the next block is selected
                if (thread.executionStack.length === 0) {
                  blockToExecute = null; // so that we dont execute the next block in the body of the RepeatWhile frame after it has completed
                  thread.count++;
                } else {
                  thread.currentFrame()!._position++;
                  blockToExecute =
                    thread.currentFrame()?._body[
                      thread.currentFrame()!._position
                    ];
                  while (
                    blockToExecute === undefined &&
                    thread.executionStack.length > 0
                  ) {
                    thread.popFrame();
                    console.warn(
                      "Popped frame from stack, current stack length:",
                      thread.executionStack.length,
                    );
                    if (thread.executionStack.length === 0) {
                      blockToExecute = null;
                      thread.count++;
                      break;
                    } else {
                      thread.currentFrame()!._position++;
                      blockToExecute =
                        thread.currentFrame()?._body[
                          thread.currentFrame()!._position
                        ];
                    }
                  }
                  console.log("Next block to execute:", blockToExecute);
                }
                if (thread.target.id === 6) {
                  console.log(
                    "Marking For frame complete after reaching end of body for target 6",
                  );
                }
              }
            } else {
              console.log(
                "Current frame is complete, popping frame from stack for target:",
                thread.target.id,
              );
              thread.popFrame();
              if (thread.executionStack.length === 0) {
                thread.count++;
              }
              continue;
            }
          }

          // console.log(
          //   "Current frame",
          //   JSON.parse(JSON.stringify(currentFrame)),
          // );
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
              console.log(
                "Marking If frame complete after reaching end of body for target:",
                thread.target.id,
              );
            } else if (currentFrame instanceof ProcedureFrameNoReturn) {
              console.log(
                "Marking Procedure frame complete after reaching end of body for procedure:",
                currentFrame._procedure.name,
              );
              currentFrame.markComplete();
            } else if (currentFrame instanceof RepeatWhileFrame) {
              let conditionResult = this._evaluator.evaluate(
                currentFrame._condition,
                thread,
              ) as boolean;
              if (
                (conditionResult && currentFrame._mode === "WHILE") ||
                (!conditionResult && currentFrame._mode === "UNTIL")
              ) {
                currentFrame._position = 0;
              } else {
                thread.popFrame(); // so that the next block is selected
                if (thread.executionStack.length === 0) {
                  blockToExecute = null; // so that we dont execute the next block in the body of the RepeatWhile frame after it has completed
                  thread.count++;
                } else {
                  thread.currentFrame()!._position++;
                  blockToExecute =
                    thread.currentFrame()?._body[
                      thread.currentFrame()!._position
                    ];
                  while (
                    blockToExecute === undefined &&
                    thread.executionStack.length > 0
                  ) {
                    thread.popFrame();
                    console.warn(
                      "Popped frame from stack, current stack length:",
                      thread.executionStack.length,
                    );
                    if (thread.executionStack.length === 0) {
                      blockToExecute = null;
                      thread.count++;
                      break;
                    } else {
                      thread.currentFrame()!._position++;
                      blockToExecute =
                        thread.currentFrame()?._body[
                          thread.currentFrame()!._position
                        ];
                    }
                  }
                }
                console.warn(
                  "Marking RepeatWhile frame complete after condition evaluated to false for target:",
                  thread.target.id,
                );
              }
            } else if (currentFrame instanceof ForFrame) {
              thread.currentFrame()?.markComplete();
            }
          }
        }
      }

      if (
        thread.executionStack.length === 0 &&
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
          thread.executionStack,
        );
        return;
      }
      if (thread.target.id === 6) {
        console.log(
          "Executing block of type",
          blockToExecute.type,
          "for target",
          thread.target,
        );
      }
      this.executeBlock(blockToExecute, thread, currentTime);

      if (thread.executionStack.length === 0) {
        thread.count++;
        if (thread.target.id === 6) {
          console.log("Thread count incremented to:", thread.count);
          //   console.log(thread.target);
        }
      }
    }
  }

  executeBlock(blockToExecute: Block, thread: Thread, currentTime: number) {
    switch (blockToExecute.type) {
      case "screen_set_position": {
        let targetX = this._evaluator.evaluate(
          blockToExecute.x,
          thread,
        ) as number;
        let targetY = this._evaluator.evaluate(
          blockToExecute.y,
          thread,
        ) as number;
        thread.target.x = targetX as number;
        thread.target.y = targetY as number;
        break;
      }

      case "screen_set_x": {
        let targetX = this._evaluator.evaluate(
          blockToExecute.x,
          thread,
        ) as number;
        thread.target.x = targetX as number;
        break;
      }
      case "screen_set_y": {
        let targetY = this._evaluator.evaluate(
          blockToExecute.y,
          thread,
        ) as number;
        thread.target.y = targetY as number;
        break;
      }

      case "logic_wait": {
        thread.status = "waiting";
        thread.waitUntil =
          currentTime +
          (this._evaluator.evaluate(
            blockToExecute.duration,
            thread,
          ) as number) *
            1000;
        return;
      }
      case "controls_whileUntil": {
        let conditionResult = this._evaluator.evaluate(
          blockToExecute.condition,
          thread,
        ) as boolean;
        if (blockToExecute.mode === "UNTIL" && !conditionResult) {
          // a repeat until thats already true should not execute the body at all
          let newFrame = new RepeatWhileFrame(
            blockToExecute.condition,
            blockToExecute.body,
            "UNTIL",
          );
          thread.addFrame(newFrame);
        } else if (blockToExecute.mode === "WHILE" && conditionResult) {
          let newFrame = new RepeatWhileFrame(
            blockToExecute.condition,
            blockToExecute.body,
            "WHILE",
          );
          thread.addFrame(newFrame);
        }
        break;
      }
      case "controls_for": {
        let startValue = this._evaluator.evaluate(
          blockToExecute.from,
          thread,
        ) as number;
        let endValue = this._evaluator.evaluate(
          blockToExecute.to,
          thread,
        ) as number;
        let stepValue = this._evaluator.evaluate(
          blockToExecute.by,
          thread,
        ) as number;

        let newFrame = new ForFrame(
          blockToExecute.variable,
          startValue,
          endValue,
          stepValue,
          blockToExecute.body,
        );
        thread.addFrame(newFrame);
        break;
      }

      case "variables_set": {
        const variableName = blockToExecute.name;

        let currentValue = thread.target.variables.get(variableName);
        console.log(
          `Current value of variable ${variableName} for target ${thread.target.id}:`,
          currentValue,
        );
        if (currentValue === undefined) {
          // check in the last procedure frame if it exists
          const filteredStack = thread.executionStack.filter(
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
              arg.value = this._evaluator.evaluate(
                blockToExecute.value,
                thread,
              ) as number;
              break;
            }
            let forFramesAfterProcedureFrame = thread.executionStack.filter(
              (frame) =>
                frame instanceof ForFrame &&
                thread.executionStack.indexOf(frame) >
                  thread.executionStack.indexOf(lastProcedureFrame),
            );
            for (let forFrame of forFramesAfterProcedureFrame) {
              if (
                forFrame instanceof ForFrame &&
                forFrame._variableName === variableName
              ) {
                throw new Error(
                  `Variable ${variableName} is a loop variable and cannot be modified.`,
                );
              }
            }
          }
          console.error(
            `Variable ${variableName} is not defined for target ${thread.target.id} and not found in procedure frame arguments.`,
          );
        } else {
          thread.target.variables.set(
            variableName,
            this._evaluator.evaluate(blockToExecute.value, thread) as number,
          );
        }
        break;
      }

      case "math_change": {
        const variableName = blockToExecute.name;
        const changeValue = this._evaluator.evaluate(
          blockToExecute.value,
          thread,
        ) as number;
        let currentValue = thread.target.variables.get(variableName);
        console.log(
          `Current value of variable ${variableName} for target ${thread.target.id}:`,
          currentValue,
        );
        if (currentValue === undefined) {
          // check in the last procedure frame if it exists
          const filteredStack = thread.executionStack.filter(
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
            } else {
              let forFramesAfterProcedureFrame = thread.executionStack.filter(
                (frame) =>
                  frame instanceof ForFrame &&
                  thread.executionStack.indexOf(frame) >
                    thread.executionStack.indexOf(lastProcedureFrame),
              );
              for (let forFrame of forFramesAfterProcedureFrame) {
                if (
                  forFrame instanceof ForFrame &&
                  forFrame._variableName === variableName
                ) {
                  throw new Error(
                    `Variable ${variableName} is a loop variable and cannot be modified.`,
                  );
                }
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
        let times = this._evaluator.evaluate(
          blockToExecute.times,
          thread,
        ) as number;
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

            if (this._evaluator.evaluate(condition, thread)) {
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
            value: this._evaluator.evaluate(arg.value, thread) as
              | number
              | string
              | boolean,
          })),
        );
        thread.addFrame(newFrame);
        break;
      }
      case "controls_flow_statements": {
        if (blockToExecute.flow === "BREAK") {
          while (thread.executionStack.length > 0) {
            // break out of the innermost loop only just like in actual programming languages
            // loop through the stack frames backwards to find the nearest RepeatFrame
            let foundRepeatFrame = false;
            for (let i = thread.executionStack.length - 1; i >= 0; i--) {
              if (
                thread.executionStack[i] instanceof RepeatFrame ||
                thread.executionStack[i] instanceof RepeatWhileFrame ||
                thread.executionStack[i] instanceof ForFrame
              ) {
                // Found the nearest RepeatFrame, pop it and break out of the loop
                thread.executionStack.splice(i, 1);
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
          for (let i = thread.executionStack.length - 1; i >= 0; i--) {
            if (
              thread.executionStack[i] instanceof RepeatFrame ||
              thread.executionStack[i] instanceof ForFrame
            ) {
              const frame = thread.executionStack[i] as RepeatFrame | ForFrame;
              if (frame instanceof RepeatFrame) {
                frame.incrementCount();
              } else if (frame instanceof ForFrame) {
                frame._currentValue += frame._stepValue;
                console.warn(
                  "Loop was skipped to next iteration. Current value after increment:",
                  frame._currentValue,
                );
              }
              if (frame.hasMoreIterations()) {
                frame._position = 0; // Reset position to the start of the loop body
              } else {
                frame.markComplete(); // Mark the loop as complete if no more iterations
              }
              break;
            } else if (thread.executionStack[i] instanceof RepeatWhileFrame) {
              const repeatWhileFrame = thread.executionStack[
                i
              ] as RepeatWhileFrame;
              let conditionResult = this._evaluator.evaluate(
                repeatWhileFrame._condition,
                thread,
              ) as boolean;
              if (
                (conditionResult && repeatWhileFrame._mode === "WHILE") ||
                (!conditionResult && repeatWhileFrame._mode === "UNTIL")
              ) {
                repeatWhileFrame._position = 0; // Reset position to the start of the loop body
              } else {
                repeatWhileFrame.markComplete(); // Mark the loop as complete if condition is not met
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
