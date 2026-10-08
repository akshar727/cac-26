import { Runtime } from "./runtime";
import { Thread } from "./thread";
import {
  ForeverFrame,
  ForFrame,
  GlideFrame,
  IfFrame,
  ProcedureFrameNoReturn,
  RepeatFrame,
  RepeatWhileUntilFrame,
} from "./stackFrame";
import { IntermediateBlock } from "../types/intermediateBlock";
import { EvaluationEngine } from "./evaluationEngine";
import { Procedure } from "@/types/field";
import { ImproperVariableError, InvalidFieldError } from "@/types/errors";

export class VirtualMachine {
  _evaluator: EvaluationEngine;
  _runtime: Runtime;
  constructor(r: Runtime) {
    this._evaluator = new EvaluationEngine(r);
    this._runtime = r;
  }
  step(thread: Thread, currentTime: number, deltaTime: number) {
    try {
      if (thread.status === "waiting") {
        if (currentTime < thread.waitUntil) {
          return;
        }

        thread.status = "running";
      }
      if (
        (thread.target.sayText || thread.target.thinkText) &&
        thread.blockedBySprite
      ) {
        // Handle say or think text rendering
        if (currentTime < thread.target.bubbleUntil) {
          return;
        }
        thread.target.clearBubbles();
        for (const otherThread of this._runtime._threads) {
          if (otherThread.target.id === thread.target.id) {
            otherThread.blockedBySprite = false;
          }
        }
        thread.blockedBySprite = false;
        thread.status = "running"; // Ensure the thread continues running after clearing bubbles
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
          return;
        }
        let foreverRuntimeYield = false;

        let blockToExecute = null;

        if (thread.executionStack.length > 0) {
          const currentFrame = thread.currentFrame();
          if (currentFrame) {
            if (
              currentFrame.isComplete() &&
              !(currentFrame instanceof GlideFrame)
            ) {
              if (currentFrame instanceof ForFrame) {
                currentFrame._currentValue += currentFrame._stepValue;
                if (
                  (currentFrame._stepValue > 0 &&
                    currentFrame._currentValue <= currentFrame._endValue) ||
                  (currentFrame._stepValue < 0 &&
                    currentFrame._currentValue >= currentFrame._endValue)
                ) {
                  currentFrame._position = 0;
                  currentFrame._finished = false;
                } else {
                  thread.popFrame();
                  if (thread.executionStack.length === 0) {
                    blockToExecute = null;
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
                }
              } else {
                thread.popFrame();
                if (thread.executionStack.length === 0) {
                  thread.count++;
                }
                continue;
              }
            }

            if (currentFrame instanceof GlideFrame) {
              if (currentFrame._cancelled) {
                thread.popFrame();
                if (thread.executionStack.length === 0) {
                  thread.count++;
                }
                continue;
              }
              currentFrame.updateElapsedTime(currentTime);
              const position = currentFrame.getPosition();
              thread.target.x = position.x;
              thread.target.y = position.y;
              if (currentFrame.isComplete()) {
                thread.target.x = currentFrame._targetX;
                thread.target.y = currentFrame._targetY;
                thread.popFrame();
                if (thread.executionStack.length === 0) {
                  thread.count++;
                }
              }
              return;
            }
            blockToExecute = currentFrame._body[currentFrame._position];
            currentFrame._position++;
            if (currentFrame._position === currentFrame._body.length) {
              if (currentFrame instanceof RepeatFrame) {
                currentFrame.incrementCount();
                if (currentFrame.hasMoreIterations()) {
                  currentFrame._position = 0;
                } else {
                  currentFrame.markComplete();
                }
              } else if (currentFrame instanceof IfFrame) {
                currentFrame.markComplete();
              } else if (currentFrame instanceof ProcedureFrameNoReturn) {
                currentFrame.markComplete();
              } else if (currentFrame instanceof RepeatWhileUntilFrame) {
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
                  thread.popFrame();
                  if (thread.executionStack.length === 0) {
                    blockToExecute = null;
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
                }
              } else if (currentFrame instanceof ForFrame) {
                thread.currentFrame()?.markComplete();
              } else if (currentFrame instanceof ForeverFrame) {
                foreverRuntimeYield = true;
                thread.currentFrame()!._position = 0;
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
          return;
        }

        try {
          this.executeBlock(blockToExecute, thread, currentTime);
        } catch (error) {
          this._runtime.setRuntimeError(
            error,
            `VirtualMachine execution error: ${blockToExecute.type}`,
          );
          throw error;
        }

        if (thread.executionStack.length === 0) {
          thread.count++;
        }
        if (foreverRuntimeYield) {
          return;
        }
      }
    } catch (error) {
      this._runtime.setRuntimeError(
        error,
        "An error occured when running your code",
      );
      throw error;
    }
  }

  executeBlock(
    blockToExecute: IntermediateBlock,
    thread: Thread,
    currentTime: number,
  ) {
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
          let newFrame = new RepeatWhileUntilFrame(
            blockToExecute.condition,
            blockToExecute.body,
            "UNTIL",
          );
          thread.addFrame(newFrame);
        } else if (blockToExecute.mode === "WHILE" && conditionResult) {
          let newFrame = new RepeatWhileUntilFrame(
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
        const filteredStack = thread.executionStack.filter(
          (frame) => frame instanceof ProcedureFrameNoReturn,
        );
        const lastProcedureFrame = filteredStack[
          filteredStack.length - 1
        ] as ProcedureFrameNoReturn;
        let forFramesAfterProcedureFrame = thread.executionStack.filter(
          (frame) =>
            frame instanceof ForFrame &&
            thread.executionStack.indexOf(frame) >
              (thread.executionStack.indexOf(lastProcedureFrame) || 0),
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
        const newValue = this._evaluator.evaluate(
          blockToExecute.value,
          thread,
        ) as number;
        if (filteredStack.length > 0) {
          const arg = lastProcedureFrame._arguments.find(
            (candidate) => candidate.name === variableName,
          );
          if (arg) {
            arg.value = newValue;
            break;
          }
        }
        const ownerId = thread.target.borrowedVariables.get(variableName);
        const owner =
          ownerId === undefined
            ? undefined
            : this._runtime._targets.find((sprite) => sprite.id === ownerId);
        if (owner?.variables.get(variableName) !== undefined) {
          owner.variables.set(variableName, newValue);
          break;
        }
        thread.target.variables.set(variableName, newValue);
        break;
      }

      case "math_change": {
        const variableName = blockToExecute.name;
        const changeValue = this._evaluator.evaluate(
          blockToExecute.value,
          thread,
        ) as number;
        // check for frames after the last procedure, then last procedure, then sprite variables
        const filteredStack = thread.executionStack.filter(
          (frame) => frame instanceof ProcedureFrameNoReturn,
        );
        const lastProcedureFrame = filteredStack[
          filteredStack.length - 1
        ] as ProcedureFrameNoReturn;
        let forFramesAfterProcedureFrame = thread.executionStack.filter(
          (frame) =>
            (frame instanceof ForFrame &&
              thread.executionStack.indexOf(frame) >
                thread.executionStack.indexOf(lastProcedureFrame)) ||
            0,
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
              break;
            } else {
              throw new ImproperVariableError(
                `Argument ${variableName} is not a number and cannot be changed. Value: ${arg.value}`,
              );
            }
          }
        }
        let currentValue = thread.target.variables.get(variableName);
        if (currentValue === undefined) {
          for (const borrowedVariableId of thread.target.borrowedVariables.keys()) {
            if (borrowedVariableId === variableName) {
              const borrowedVariableValue = this._runtime._targets
                .find(
                  (sprite) =>
                    sprite.id ===
                    thread.target.borrowedVariables.get(borrowedVariableId),
                )
                ?.variables.get(variableName);
              if (borrowedVariableValue !== undefined) {
                if (
                  typeof borrowedVariableValue !== "number" ||
                  typeof changeValue !== "number"
                ) {
                  throw new ImproperVariableError(
                    `Borrowed variable ${variableName} is not a number and cannot be changed. Value: ${borrowedVariableValue}`,
                  );
                  break;
                }
                this._runtime._targets
                  .find(
                    (sprite) =>
                      sprite.id ===
                      thread.target.borrowedVariables.get(borrowedVariableId),
                  )
                  ?.variables.set(
                    variableName,
                    borrowedVariableValue + (changeValue as number),
                  );
                return;
              }
            }
          }
        }
        if (typeof currentValue === "number") {
          thread.target.variables.set(
            variableName,
            currentValue + (changeValue as number),
          );
        } else {
          throw new ImproperVariableError(
            `Variable ${variableName} is not a number and cannot be changed. Value: ${currentValue}`,
          );
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
            const thenBody = blockToExecute[thenBodyKey] as IntermediateBlock[];

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
      case "controls_forever": {
        const newFrame = new ForeverFrame(blockToExecute.body);
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
                thread.executionStack[i] instanceof RepeatWhileUntilFrame ||
                thread.executionStack[i] instanceof ForFrame ||
                thread.executionStack[i] instanceof ForeverFrame
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
              }
              if (frame.hasMoreIterations()) {
                frame._position = 0; // Reset position to the start of the loop body
              } else {
                frame.markComplete(); // Mark the loop as complete if no more iterations
              }
              break;
            } else if (
              thread.executionStack[i] instanceof RepeatWhileUntilFrame
            ) {
              const repeatWhileFrame = thread.executionStack[
                i
              ] as RepeatWhileUntilFrame;
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
            } else if (thread.executionStack[i] instanceof ForeverFrame) {
              const foreverFrame = thread.executionStack[i] as ForeverFrame;
              foreverFrame._position = 0; // Reset position to the start of the loop body
              break;
            }
          }
        }
        break;
      }
      case "screen_change_x": {
        let changeValue = this._evaluator.evaluate(
          blockToExecute.delta,
          thread,
        ) as number;
        thread.target.x += changeValue;
        break;
      }
      case "screen_change_y": {
        let changeValue = this._evaluator.evaluate(
          blockToExecute.delta,
          thread,
        ) as number;
        thread.target.y += changeValue;
        break;
      }
      case "screen_rotate_clockwise": {
        let changeValue = this._evaluator.evaluate(
          blockToExecute.degrees,
          thread,
        ) as number;
        thread.target.direction += changeValue;
        break;
      }
      case "screen_rotate_counterclockwise": {
        let changeValue = this._evaluator.evaluate(
          blockToExecute.degrees,
          thread,
        ) as number;
        thread.target.direction -= changeValue;
        break;
      }
      case "screen_set_rotation": {
        let targetRotation = this._evaluator.evaluate(
          blockToExecute.degrees,
          thread,
        ) as number;
        thread.target.direction = targetRotation;
        break;
      }
      case "screen_next_costume": {
        thread.target.currentCostumeIndex++;
        if (
          thread.target.currentCostumeIndex >= thread.target._costumes.length
        ) {
          thread.target.currentCostumeIndex = 0;
        }
        break;
      }
      case "screen_set_costume": {
        let costumePath = blockToExecute.costume;
        let costumeIndex = thread.target._costumes.findIndex(
          (img) => img.src === costumePath,
        );
        if (costumeIndex !== -1) {
          thread.target.currentCostumeIndex = costumeIndex;
        } else {
          console.warn(
            `Costume with path ${costumePath} not found for target ${thread.target.id}. Available costumes: ${thread.target._costumes.map((c) => c.src).join(", ")}`,
          );
        }
        break;
      }
      case "screen_show": {
        thread.target.visible = true;
        break;
      }
      case "screen_hide": {
        thread.target.visible = false;
        break;
      }
      case "screen_set_size": {
        let targetSize = this._evaluator.evaluate(
          blockToExecute.size,
          thread,
        ) as number;
        thread.target.size = targetSize;
        break;
      }
      case "screen_change_size": {
        let changeValue = this._evaluator.evaluate(
          blockToExecute.delta,
          thread,
        ) as number;
        thread.target.size += changeValue;
        break;
      }
      case "text_append": {
        const variableName = blockToExecute.variableName;
        const textToAppend = blockToExecute.text;
        const currentValue = thread.target.variables.get(variableName);
        if (typeof currentValue === "string") {
          thread.target.variables.set(
            variableName,
            (currentValue +
              this._evaluator.evaluate(textToAppend, thread)) as string,
          );
        } else if (currentValue === undefined) {
          // If the variable doesn't exist, initialize it with the text to append
          thread.target.variables.set(
            variableName,
            this._evaluator.evaluate(textToAppend, thread) as string,
          );
        } else {
          throw new ImproperVariableError(
            `Variable ${variableName} is not a string and cannot be appended to. Value: ${currentValue}`,
          );
        }
        break;
      }
      case "events_broadcast": {
        const broadcastMessage = blockToExecute.message;
        this._runtime.broadcastReceived(broadcastMessage);
        break;
      }
      case "screen_clone": {
        this._runtime.createClone(thread.target);
        break;
      }
      case "screen_glide": {
        const duration = this._evaluator.evaluate(
          blockToExecute.duration,
          thread,
        ) as number;
        const targetX = this._evaluator.evaluate(
          blockToExecute.x,
          thread,
        ) as number;
        const targetY = this._evaluator.evaluate(
          blockToExecute.y,
          thread,
        ) as number;
        //@ts-ignore
        if (isNaN(parseFloat(targetX)) || isNaN(parseFloat(targetY))) {
          throw new InvalidFieldError(
            `Invalid glide target coordinates: (${targetX}, ${targetY}).`,
          );
          return;
        }

        const startTime = performance.now();
        const endTime = startTime + duration * 1000;
        this.cancelOtherGlides(thread);
        const newFrame = new GlideFrame(
          thread.target.x,
          thread.target.y,
          targetX,
          targetY,
          startTime,
          endTime,
        );
        thread.addFrame(newFrame);
        break;
      }
      case "screen_glide_preset": {
        const duration = this._evaluator.evaluate(
          blockToExecute.duration,
          thread,
        ) as number;
        let targetX,
          targetY = 0;
        if (blockToExecute.preset === "MOUSE_POINTER") {
          const mousePosition = this._runtime.getMousePosition();
          targetX =
            mousePosition.x -
            ((thread.target._costumes[thread.target.currentCostumeIndex].width /
              2) *
              thread.target.size) /
              100;
          targetY =
            mousePosition.y -
            ((thread.target._costumes[thread.target.currentCostumeIndex]
              .height /
              2) *
              thread.target.size) /
              100;
        } else if (blockToExecute.preset === "RANDOM_POSITION") {
          // lets not hardcode these later on
          targetX = Math.random() * 800;
          targetY = Math.random() * 600;
        } else {
          let targetSprite = this._runtime._targets.find(
            (sprite) => sprite.id === parseInt(blockToExecute.preset),
          );
          if (!targetSprite) {
            console.warn(
              `Target sprite with name ${blockToExecute.preset} not found.`,
            );
            return;
          }
          targetX = targetSprite.x;
          targetY = targetSprite.y;
        }

        const startTime = performance.now();
        const endTime = startTime + duration * 1000;
        this.cancelOtherGlides(thread);
        const newFrame = new GlideFrame(
          thread.target.x,
          thread.target.y,
          targetX,
          targetY,
          startTime,
          endTime,
        );
        thread.addFrame(newFrame);
        break;
      }
      case "screen_say": {
        const message = this._evaluator.evaluate(
          blockToExecute.message,
          thread,
        );
        const duration = this._evaluator.evaluate(
          blockToExecute.duration,
          thread,
        ) as number;
        for (const otherThread of this._runtime._threads) {
          if (otherThread.target.id === thread.target.id) {
            otherThread.blockedBySprite = false;
            otherThread.status = "running";
            otherThread.target.sayText = "";
            otherThread.target.thinkText = "";
          }
        }
        thread.status = "bubbling";
        thread.target.markSay(message as string, duration, currentTime);
        thread.blockedBySprite = true;
        break;
      }
      case "screen_think": {
        const message = this._evaluator.evaluate(
          blockToExecute.message,
          thread,
        );
        const duration = this._evaluator.evaluate(
          blockToExecute.duration,
          thread,
        ) as number;
        for (const otherThread of this._runtime._threads) {
          if (otherThread.target.id === thread.target.id) {
            otherThread.blockedBySprite = false;
            otherThread.status = "running";
            otherThread.target.sayText = "";
            otherThread.target.thinkText = "";
          }
        }
        thread.status = "bubbling";
        thread.target.markThink(message as string, duration, currentTime);
        thread.blockedBySprite = true;
        break;
      }
      case "screen_clear_speech_bubbles": {
        thread.target.clearBubbles();
        for (const otherThread of this._runtime._threads) {
          if (otherThread.target.id === thread.target.id) {
            otherThread.blockedBySprite = false;
            otherThread.status = "running";
            otherThread.target.sayText = "";
            otherThread.target.thinkText = "";
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

  private cancelOtherGlides(thread: Thread) {
    for (const otherThread of this._runtime._threads) {
      if (otherThread.target === thread.target && otherThread !== thread) {
        const frame = otherThread.currentFrame();
        if (frame instanceof GlideFrame) {
          frame.cancel();
          otherThread.status = "done";
        }
      }
    }
  }

  private cloneFrame(frame: ReturnType<Thread["currentFrame"]>): any {
    if (frame instanceof RepeatFrame) {
      const clone = new RepeatFrame(frame._times, frame._body);
      clone._position = frame._position;
      clone._currentCount = frame._currentCount;
      clone._finished = frame._finished;
      return clone;
    }
    if (frame instanceof IfFrame) {
      const clone = new IfFrame(frame._body);
      clone._position = frame._position;
      clone._finished = frame._finished;
      return clone;
    }
    if (frame instanceof ProcedureFrameNoReturn) {
      const clone = new ProcedureFrameNoReturn(
        frame._procedure,
        frame._arguments.map((argument) => ({
          name: argument.name,
          value: argument.value as number | string | boolean,
        })),
      );
      clone._position = frame._position;
      clone._finished = frame._finished;
      clone._pendingEvaluation = frame._pendingEvaluation;
      return clone;
    }
    if (frame instanceof RepeatWhileUntilFrame) {
      const clone = new RepeatWhileUntilFrame(
        frame._condition,
        frame._body,
        frame._mode,
      );
      clone._position = frame._position;
      clone._finished = frame._finished;
      return clone;
    }
    if (frame instanceof ForFrame) {
      const clone = new ForFrame(
        frame._variableName,
        frame._startValue,
        frame._endValue,
        frame._stepValue,
        frame._body,
      );
      clone._position = frame._position;
      clone._currentValue = frame._currentValue;
      clone._finished = frame._finished;
      return clone;
    }
    if (frame instanceof ForeverFrame) {
      const clone = new ForeverFrame(frame._body);
      clone._position = frame._position;
      clone._finished = frame._finished;
      return clone;
    }
    if (frame instanceof GlideFrame) {
      const clone = new GlideFrame(
        frame._startX,
        frame._startY,
        frame._targetX,
        frame._targetY,
        frame._startTime,
        frame._endTime,
      );
      clone._currentTime = frame._currentTime;
      clone._cancelled = frame._cancelled;
      clone._position = frame._position;
      clone._finished = frame._finished;
      return clone;
    }
    throw new Error("Unsupported stack frame while cloning a thread");
  }
}
