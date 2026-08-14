import {
  Condition,
  ConditionType,
  conditionTypes,
  Value,
  ValueType,
  valueTypes,
} from "@/types/field";
import { ForFrame, ProcedureFrameNoReturn } from "./stackFrame";
import { Thread } from "./thread";

export class SuspendedReturn {}

export class EvaluationEngine {
  // private nextEvaluationId = 1;
  private evaluateCondition(
    condition: Condition,
    processingThread: Thread,
  ): boolean | null {
    if (!condition) {
      console.error("Condition is undefined or null:", condition);
      return false;
    }
    switch (condition.type) {
      case "logic_compare": {
        const left = this.evaluate(condition.left, processingThread);
        const right = this.evaluate(condition.right, processingThread);
        switch (condition.operator) {
          case "EQ":
            return left === right;
          case "NEQ":
            return left !== right;
          case "LT":
            if (left === null || right === null) {
              throw new Error(
                "Cannot compare null values in logic_compare with operator LT",
              );
            }
            return left < right;
          case "LTE":
            if (left === null || right === null) {
              throw new Error(
                "Cannot compare null values in logic_compare with operator LTE",
              );
            }
            return left <= right;
          case "GT":
            if (left === null || right === null) {
              throw new Error(
                "Cannot compare null values in logic_compare with operator GT",
              );
            }
            return left > right;
          case "GTE":
            if (left === null || right === null) {
              throw new Error(
                "Cannot compare null values in logic_compare with operator GTE",
              );
            }
            return left >= right;
          default:
            //@ts-ignore
            console.error("Unknown operator:", condition.operator);
            return false;
        }
      }
      case "logic_operation": {
        const left = this.evaluate(condition.left, processingThread) as boolean;
        const right = this.evaluate(
          condition.right,
          processingThread,
        ) as boolean;
        switch (condition.operator) {
          case "AND":
            return left && right;
          case "OR":
            return left || right;
          default:
            //@ts-ignore
            console.error("Unknown operator:", condition.operator);
            return false;
        }
      }
      case "logic_negate": {
        const operand = this.evaluate(
          condition.operand,
          processingThread,
        ) as boolean;
        return !operand;
      }
      case "logic_boolean": {
        return condition.value;
      }
      case "logic_null": {
        return null;
      }
      default:
        throw new Error(`Unknown condition. ${JSON.stringify(condition)}`);
    }
  }

  private evaluateValue(
    field: Value,
    processingThread: Thread,
  ): number | string | boolean | null {
    if (!field) {
      console.error("Field is undefined or null:", field);
      return 0;
    }
    if (field.type === "math_number") {
      return field.value;
    } else if (typeof field === "object" && "type" in field && field !== null) {
      switch (field.type) {
        case "math_arithmetic":
          const left = this.evaluate(field.left, processingThread) as number;
          const right = this.evaluate(field.right, processingThread) as number;
          switch (field.operator) {
            case "ADD":
              return left + right;
            case "MINUS":
              return left - right;
            case "MULTIPLY":
              return left * right;
            case "DIVIDE":
              return left / right;
            case "POWER":
              return Math.pow(left, right);
          }
          throw new Error(
            //@ts-ignore
            `Unknown operator: ${field.operator}. ${JSON.stringify(field)}`,
          );
        case "math_single":
          const input = this.evaluate(
            field.operand,
            processingThread,
          ) as number;
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
          const trigInput = this.evaluate(
            field.operand,
            processingThread,
          ) as number;
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
          const roundInput = this.evaluate(
            field.operand,
            processingThread,
          ) as number;
          switch (field.operator) {
            case "ROUND":
              return Math.round(roundInput);
            case "ROUNDUP":
              return Math.ceil(roundInput);
            case "ROUNDDOWN":
              return Math.floor(roundInput);
          }
        case "math_modulo":
          const dividend = this.evaluate(
            field.dividend,
            processingThread,
          ) as number;

          const divisor = this.evaluate(
            field.divisor,
            processingThread,
          ) as number;

          return dividend % divisor;
        case "math_constrain":
          const value = this.evaluate(field.value, processingThread) as number;
          const low = this.evaluate(field.low, processingThread) as number;
          const high = this.evaluate(field.high, processingThread) as number;
          return Math.min(Math.max(value, low), high);
        case "math_random_int":
          const from = this.evaluate(field.from, processingThread) as number;
          const to = this.evaluate(field.to, processingThread) as number;
          return Math.floor(Math.random() * (to - from + 1)) + from;
        case "math_random_float":
          return Math.random();
        case "math_atan2":
          const y = this.evaluate(field.y, processingThread) as number;
          const x = this.evaluate(field.x, processingThread) as number;
          return Math.atan2(y, x);
        case "variables_get":
          // for frames (after last procedure frame if applicable), procedure arguments, and then sprite variables
          const variableName = field.name;
          const variableValue =
            processingThread.target.variables.get(variableName);
          const lastProcedureFrame = processingThread.executionStack
            .slice()
            .reverse()
            .find((frame) => frame instanceof ProcedureFrameNoReturn) as
            | ProcedureFrameNoReturn
            | undefined;
          let allForFramesAfterLastProcedureFrame: any[] = [];
          if (lastProcedureFrame) {
            const lastProcedureFrameIndex =
              processingThread.executionStack.indexOf(lastProcedureFrame);
            allForFramesAfterLastProcedureFrame =
              processingThread.executionStack
                .slice(lastProcedureFrameIndex + 1)
                .filter((frame) => frame instanceof ForFrame);
          } else {
            allForFramesAfterLastProcedureFrame =
              processingThread.executionStack.filter(
                (frame) => frame instanceof ForFrame,
              );
          }
          for (const frame of allForFramesAfterLastProcedureFrame) {
            if (
              frame instanceof ForFrame &&
              frame._variableName === variableName
            ) {
              return frame._currentValue;
            }
          }
          if (lastProcedureFrame) {
            const arg = lastProcedureFrame._arguments.find(
              (arg) => arg.name === variableName,
            );
            if (arg) {
              return arg.value as number | string | boolean;
            }
          }
          if (variableValue === undefined) {
            throw new Error(
              `Variable ${variableName} is not defined. ${JSON.stringify(processingThread.target.variables)}`,
            );
          }
          return variableValue;
        case "screen_position_x": {
          return processingThread.target.x;
        }
        case "screen_position_y": {
          return processingThread.target.y;
        }
        case "screen_rotation": {
          return processingThread.target.direction;
        }
        case "logic_ternary": {
          const conditionResult = this.evaluate(
            field.condition,
            processingThread,
          ) as boolean;
          if (conditionResult) {
            return this.evaluate(field.trueValue, processingThread);
          } else {
            return this.evaluate(field.falseValue, processingThread);
          }
        }
        default:
          throw new Error(
            //@ts-ignore
            `Unknown field type: ${field.type}. ${JSON.stringify(field)}`,
          );
      }
    }
    throw new Error("Invalid field value: " + JSON.stringify(field));
  }

  evaluate(
    field: Value | Condition,
    processingThread: Thread,
  ): number | string | boolean | null {
    if (!field) {
      console.error("Field is undefined or null:", field);
      return 0;
    }
    if (typeof field === "object" && "type" in field && field !== null) {
      if (valueTypes.includes(field.type as ValueType)) {
        return this.evaluateValue(field as Value, processingThread);
      } else if (conditionTypes.includes(field.type as ConditionType)) {
        return this.evaluateCondition(field as Condition, processingThread);
      } else {
        throw new Error(
          `Unknown field type: ${field.type}. ${JSON.stringify(field)}`,
        );
      }
    } else {
      throw new Error("Invalid field value: " + JSON.stringify(field));
    }
  }
}
