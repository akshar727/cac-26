import { Predicate, Value } from "@/types/field";
import { Runtime } from "./runtime";
import { Thread } from "./thread";
import { RepeatFrame } from "./stackFrame";
import { Block } from "./block";

export class VirtualMachine {
  _processingThread: Thread | null = null;
  step(thread: Thread, runtime: Runtime, currentTime: number) {
    this._processingThread = thread;
    if (thread.status === "waiting") {
      if (currentTime < thread.waitUntil) {
        // console.log(
        //   `Thread for target ${thread.target.id} is still waiting until ${thread.waitUntil}. Current time: ${currentTime}`,
        // );
        this._processingThread = null;
        return;
      }

      thread.status = "running";
      if (thread.stack.length === 0) {
        thread.count++;
      }
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
        this._processingThread = null;
        return;
      }

      let blockToExecute = null;

      if (thread.stack.length > 0) {
        const currentFrame = thread.currentFrame();

        if (currentFrame) {
          blockToExecute = currentFrame._body[currentFrame._position];

          currentFrame._position++;

          if (currentFrame._position === currentFrame._body.length) {
            if (currentFrame instanceof RepeatFrame) {
              currentFrame.incrementCount();

              if (currentFrame.hasMoreIterations()) {
                currentFrame._position = 0;
              } else {
                thread.popFrame();
                if (thread.stack.length === 0) {
                  console.log("Stack is empty after popping RepeatFrame");
                }
              }
            } else {
              console.log("Popping frame after reaching end of body");
              thread.popFrame();
            }
          }
        }
      }

      if (thread.stack.length === 0 && blockToExecute === null) {
        blockToExecute = thread.script.blocks[thread.count];
      }

      if (!blockToExecute) {
        thread.status = "done";
        console.log(
          "Thread completed for target:",
          thread.target.id,
          "program counter:",
          thread.count,
        );
        this._processingThread = null;
        return;
      }
      switch (blockToExecute.type) {
        case "screen_set_position": {
          thread.target.x = this.evaluateMath(blockToExecute.x) as number;
          thread.target.y = this.evaluateMath(blockToExecute.y) as number;
          break;
        }

        case "screen_set_x": {
          thread.target.x = this.evaluateMath(blockToExecute.x) as number;
          break;
        }
        case "screen_set_y": {
          thread.target.y = this.evaluateMath(blockToExecute.y) as number;
          break;
        }

        case "logic_wait": {
          console.log(
            `Thread for target ${thread.target.id} is waiting for ${this.evaluateMath(blockToExecute.duration)} seconds.`,
          );
          thread.status = "waiting";
          thread.waitUntil =
            currentTime +
            (this.evaluateMath(blockToExecute.duration) as number) * 1000;
          this._processingThread = null;
          console.log(thread);
          return;
        }
        case "variables_set": {
          const variableName = blockToExecute.name;
          const value = this.evaluateMath(blockToExecute.value);

          thread.target.variables.set(variableName, value);
          break;
        }

        case "math_change": {
          const variableName = blockToExecute.name;
          const changeValue = this.evaluateMath(blockToExecute.value) as number;
          const currentValue = thread.target.variables.get(variableName);

          if (typeof currentValue === "number") {
            thread.target.variables.set(
              variableName,
              currentValue + changeValue,
            );
          } else {
            console.error(
              `Variable ${variableName} is not a number and cannot be changed.`,
            );
          }

          break;
        }

        case "controls_repeat_ext": {
          const times = this.evaluateMath(blockToExecute.times) as number;

          if (times > 0 && blockToExecute.body.length > 0) {
            const repeatFrame = new RepeatFrame(times, blockToExecute.body);

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
              const condition = blockToExecute[conditionKey] as Predicate;
              //@ts-expect-error
              const thenBody = blockToExecute[thenBodyKey] as Block[];

              if (this.evaluatePredicate(condition)) {
                thread.addFrame({
                  _body: thenBody,
                  _position: 0,
                });
                console.log(
                  `Condition met for IF block in target ${thread.target.id}. Executing thenBody.`,
                );
                conditionMet = true;
                break;
              }
            }
            n++;
          } while (blockToExecute.hasOwnProperty("condition" + n));

          if (!conditionMet && blockToExecute.hasOwnProperty("elseBody")) {
            console.log(
              `No conditions met for IF block in target ${thread.target.id}. Executing elseBody.`,
            );
            thread.addFrame({
              //@ts-expect-error
              _body: blockToExecute.elseBody,
              _position: 0,
            });
          }
          break;
        }
        default:
          //@ts-ignore
          console.warn("Unknown block type:", blockToExecute.type);
          break;
      }

      if (thread.stack.length === 0) {
        thread.count++;
        if (thread.target.id === 6) {
          console.log("Thread count incremented to:", thread.count);
        }
      }
    }

    this._processingThread = null;
  }

  evaluatePredicate(predicate: Predicate): boolean | null {
    if (!predicate) {
      console.error("Predicate is undefined or null:", predicate);
      return false;
    }
    switch (predicate.type) {
      case "logic_compare": {
        const left = this.evaluateMath(predicate.left);
        const right = this.evaluateMath(predicate.right);
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
            console.error("Unknown operator:", predicate.operator);
            return false;
        }
      }
      case "logic_operation": {
        const left = this.evaluatePredicate(predicate.left);
        const right = this.evaluatePredicate(predicate.right);
        switch (predicate.operator) {
          case "AND":
            return left && right;
          case "OR":
            return left || right;
          default:
            console.error("Unknown operator:", predicate.operator);
            return false;
        }
      }
      case "logic_negate": {
        const operand = this.evaluatePredicate(predicate.operand);
        return !operand;
      }
      case "logic_boolean": {
        return predicate.value;
      }
      case "logic_null": {
        return null;
      }
      default:
        console.error("Unknown predicate type:", predicate.type);
        return false;
    }
  }

  evaluateMath(field: Value): number | string | boolean {
    if (!field) {
      console.error("Field is undefined or null:", field);
      return 0;
    }
    if (field.type === "math_number") {
      return field.value;
    } else if (typeof field === "object" && "type" in field && field !== null) {
      switch (field.type) {
        case "math_arithmetic":
          const left = this.evaluateMath(field.left) as number;
          const right = this.evaluateMath(field.right) as number;
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
          const input = this.evaluateMath(field.operand) as number;
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
          const trigInput = this.evaluateMath(field.operand) as number;
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
          const roundInput = this.evaluateMath(field.operand) as number;
          switch (field.operator) {
            case "ROUND":
              return Math.round(roundInput);
            case "ROUNDUP":
              return Math.ceil(roundInput);
            case "ROUNDDOWN":
              return Math.floor(roundInput);
          }
        case "math_modulo":
          const dividend = this.evaluateMath(field.dividend) as number;
          const divisor = this.evaluateMath(field.divisor) as number;
          return dividend % divisor;
        case "math_constrain":
          const value = this.evaluateMath(field.value) as number;
          const low = this.evaluateMath(field.low) as number;
          const high = this.evaluateMath(field.high) as number;
          return Math.min(Math.max(value, low), high);
        case "math_random_int":
          const from = this.evaluateMath(field.from) as number;
          const to = this.evaluateMath(field.to) as number;
          return Math.floor(Math.random() * (to - from + 1)) + from;
        case "math_random_float":
          return Math.random();
        case "math_atan2":
          const y = this.evaluateMath(field.y) as number;
          const x = this.evaluateMath(field.x) as number;
          return Math.atan2(y, x);
        case "variables_get":
          const variableName = field.name;
          if (!this._processingThread) {
            throw new Error("No processing thread available");
          }
          const variableValue =
            this._processingThread.target.variables.get(variableName);
          if (variableValue === undefined) {
            throw new Error(`Variable ${variableName} is not defined`);
          }
          return variableValue;
        default:
          throw new Error(
            // @ts-ignore
            `Unknown field type: ${field.type}. ${JSON.stringify(field)}`,
          );
      }
    }
    throw new Error("Invalid field value");
  }
}
