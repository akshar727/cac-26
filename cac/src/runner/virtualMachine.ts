import { Condition, Procedure, Value } from "@/types/field";
import { Runtime } from "./runtime";
import { Thread } from "./thread";
import { IfFrame, ProcedureFrame, RepeatFrame } from "./stackFrame";
import { Block } from "../types/block";

class SuspendedReturn {}

export class VirtualMachine {
  _processingThread: Thread | null = null;
  step(thread: Thread, runtime: Runtime, currentTime: number) {
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
              //   console.warn(
              //     "Thread count incremented to (due to frame completion):",
              //     thread.count,
              //   );
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
              //   console.warn(
              //     "Repeat frame incremented count to:",
              //     currentFrame._currentCount,
              //   );
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
            } else if (currentFrame instanceof ProcedureFrame) {
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
        let targetX = this.evaluateValue(blockToExecute.x);
        let targetY = this.evaluateValue(blockToExecute.y);
        thread.target.x = targetX as number;
        thread.target.y = targetY as number;
        break;
      }

      case "screen_set_x": {
        let targetX = this.evaluateValue(blockToExecute.x);
        thread.target.x = targetX as number;
        break;
      }
      case "screen_set_y": {
        let targetY = this.evaluateValue(blockToExecute.y);
        thread.target.y = targetY as number;
        break;
      }

      case "logic_wait": {
        thread.status = "waiting";
        thread.waitUntil =
          currentTime +
          (this.evaluateValue(blockToExecute.duration) as number) * 1000;
        this._processingThread = null;
        return;
      }
      case "variables_set": {
        const variableName = blockToExecute.name;

        let currentValue = thread.target.variables.get(variableName);
        if (currentValue === undefined) {
          // check in the last procedure frame if it exists
          const filteredStack = thread.stack.filter(
            (frame) => frame instanceof ProcedureFrame,
          );
          if (filteredStack.length > 0) {
            const lastProcedureFrame = filteredStack[
              filteredStack.length - 1
            ] as ProcedureFrame;
            const arg = lastProcedureFrame._arguments.find(
              (arg) => arg.name === variableName,
            );
            if (arg) {
              arg.value = this.evaluateValue(blockToExecute.value) as number;
              break;
            }
          }
          console.error(
            `Variable ${variableName} is not defined for target ${thread.target.id} and not found in procedure frame arguments.`,
          );
        } else {
          thread.target.variables.set(
            variableName,
            this.evaluateValue(blockToExecute.value) as number,
          );
        }
        break;
      }

      case "math_change": {
        const variableName = blockToExecute.name;
        const changeValue = this.evaluateValue(blockToExecute.value);
        let currentValue = thread.target.variables.get(variableName);
        if (currentValue === undefined) {
          //   console.warn(
          //     "Variable",
          //     variableName,
          //     "is not defined for target",
          //     thread.target.id,
          //     "checking procedure frame arguments...",
          //   );
          // check in the last procedure frame if it exists
          const filteredStack = thread.stack.filter(
            (frame) => frame instanceof ProcedureFrame,
          );
          if (filteredStack.length > 0) {
            const lastProcedureFrame = filteredStack[
              filteredStack.length - 1
            ] as ProcedureFrame;
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
            // console.warn(
            //   `Variable ${variableName} changed to ${currentValue + (changeValue as number)} for target ${thread.target.id}`,
            // );
          } else {
            console.error(
              `Variable ${variableName} is not a number and cannot be changed. Value: ${currentValue}`,
            );
          }
        }
        break;
      }

      case "controls_repeat_ext": {
        let times = this.evaluateValue(blockToExecute.times);
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

            if (this.evaluateCondition(condition)) {
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
        const newFrame = new ProcedureFrame(
          thread.target.procedures.get(blockToExecute.name) as Procedure,
          blockToExecute.arguments.map((arg) => ({
            name: arg.name,
            value: this.evaluateValue(arg.value) as number | string | boolean,
          })),
          thread.count,
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

  evaluateCondition(predicate: Condition): boolean | null {
    if (!predicate) {
      console.error("Predicate is undefined or null:", predicate);
      return false;
    }
    switch (predicate.type) {
      case "logic_compare": {
        const left = this.evaluateValue(predicate.left);
        const right = this.evaluateValue(predicate.right);
        switch (predicate.operator) {
          case "EQ":
            return left === right;
          case "NEQ":
            return left !== right;
          case "LT":
            return left < right;
          case "LTE":
            return left <= right;
          case "GT":
            return left > right;
          case "GTE":
            return left >= right;
          default:
            //@ts-ignore
            console.error("Unknown operator:", predicate.operator);
            return false;
        }
      }
      case "logic_operation": {
        const left = this.evaluateCondition(predicate.left);
        const right = this.evaluateCondition(predicate.right);
        switch (predicate.operator) {
          case "AND":
            return left && right;
          case "OR":
            return left || right;
          default:
            //@ts-ignore
            console.error("Unknown operator:", predicate.operator);
            return false;
        }
      }
      case "logic_negate": {
        const operand = this.evaluateCondition(predicate.operand);
        return !operand;
      }
      case "logic_boolean": {
        return predicate.value;
      }
      case "logic_null": {
        return null;
      }
      default:
        //@ts-ignore
        console.error("Unknown predicate type:", predicate.type);
        return false;
    }
  }

  evaluateValue(field: Value): number | string | boolean | SuspendedReturn {
    if (!field) {
      console.error("Field is undefined or null:", field);
      return 0;
    }
    if (field.type === "procedures_callreturn") {
      if (!this._processingThread) {
        throw new Error("No processing thread available");
      }
      // todo
    }
    if (field.type === "math_number") {
      return field.value;
    } else if (typeof field === "object" && "type" in field && field !== null) {
      switch (field.type) {
        case "math_arithmetic":
          const left = this.evaluateValue(field.left) as number;
          const right = this.evaluateValue(field.right) as number;
          switch (field.operator) {
            case "ADD":
              return left + right;
            case "SUBTRACT":
              return left - right;
            case "MULTIPLY":
              return left * right;
            case "DIVIDE":
              return left / right;
            case "POWER":
              return Math.pow(left, right);
          }
        case "math_single":
          const input = this.evaluateValue(field.operand) as number;
          switch (field.operator) {
            case "NEG":
              return -input;
            case "ABS":
              return Math.abs(input);
            case "ROOT":
              return Math.sqrt(input);
            case "LN":
              return Math.log(input);
            case "LOG10":
              return Math.log10(input);
            case "EXP":
              return Math.exp(input);
            case "POW10":
              return Math.pow(10, input);
          }
        case "math_trig":
          const trigInput = this.evaluateValue(field.operand) as number;
          switch (field.operator) {
            case "SIN":
              return Math.sin(trigInput);
            case "COS":
              return Math.cos(trigInput);
            case "TAN":
              return Math.tan(trigInput);
            case "ASIN":
              return Math.asin(trigInput);
            case "ACOS":
              return Math.acos(trigInput);
            case "ATAN":
              return Math.atan(trigInput);
          }
        case "math_constant":
          switch (field.constant) {
            case "PI":
              return Math.PI;
            case "E":
              return Math.E;
            case "GOLDEN_RATIO":
              return (1 + Math.sqrt(5)) / 2;
            case "SQRT2":
              return Math.SQRT2;
            case "SQRT1_2":
              return Math.SQRT1_2;
            case "INFINITY":
              return Infinity;
          }
        case "math_round":
          const roundInput = this.evaluateValue(field.operand) as number;
          switch (field.operator) {
            case "ROUND":
              return Math.round(roundInput);
            case "ROUNDUP":
              return Math.ceil(roundInput);
            case "ROUNDDOWN":
              return Math.floor(roundInput);
          }
        case "math_modulo":
          const dividend = this.evaluateValue(field.dividend) as number;

          const divisor = this.evaluateValue(field.divisor) as number;

          return dividend % divisor;
        case "math_constrain":
          const value = this.evaluateValue(field.value) as number;
          const low = this.evaluateValue(field.low) as number;
          const high = this.evaluateValue(field.high) as number;
          return Math.min(Math.max(value, low), high);
        case "math_random_int":
          const from = this.evaluateValue(field.from) as number;
          const to = this.evaluateValue(field.to) as number;
          return Math.floor(Math.random() * (to - from + 1)) + from;
        case "math_random_float":
          return Math.random();
        case "math_atan2":
          const y = this.evaluateValue(field.y) as number;
          const x = this.evaluateValue(field.x) as number;
          return Math.atan2(y, x);
        case "variables_get":
          const variableName = field.name;
          if (!this._processingThread) {
            throw new Error("No processing thread available");
          }
          const variableValue =
            this._processingThread.target.variables.get(variableName);
          const lastProcedureFrame = this._processingThread.stack
            .slice()
            .reverse()
            .find((frame) => frame instanceof ProcedureFrame) as
            | ProcedureFrame
            | undefined;
          if (lastProcedureFrame) {
            const arg = lastProcedureFrame._arguments.find(
              (arg) => arg.name === variableName,
            );
            if (arg) {
              return arg.value;
            }
          }
          if (variableValue === undefined) {
            throw new Error(
              `Variable ${variableName} is not defined. ${JSON.stringify(this._processingThread.target.variables)}`,
            );
          }
          return variableValue;
        default:
          throw new Error(
            // @ts-ignore
            `Unknown field type: ${field.type}. ${JSON.stringify(field)}`,
          );
      }
    }
    throw new Error("Invalid field value: " + JSON.stringify(field));
  }
}
