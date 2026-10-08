import {
  Condition,
  ConditionType,
  conditionTypes,
  TextType,
  textTypes,
  Text,
  Value,
  ValueType,
  valueTypes,
} from "@/types/field";
import { ForFrame, ProcedureFrameNoReturn } from "./stackFrame";
import { Thread } from "./thread";
import { Runtime } from "./runtime";
import { InvalidFieldError, NoProcessingThreadError } from "@/types/errors";

export class EvaluationEngine {
  // private nextEvaluationId = 1;
  _runtime: Runtime;

  constructor(runtime: Runtime) {
    this._runtime = runtime;
  }
  private evaluateCondition(
    condition: Condition,
    processingThread: Thread,
  ): boolean | null {
    if (!condition) {
      throw new InvalidFieldError(
        `Condition is undefined or null: ${JSON.stringify(condition)}`,
      );
    }
    if (!processingThread) {
      throw new NoProcessingThreadError(
        `Processing thread is undefined or null in evaluateCondition: ${JSON.stringify(processingThread)}`,
      );
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
            throw new InvalidFieldError(
              `Unknown operator: ${(condition as { operator: string }).operator}`,
            );
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
            throw new InvalidFieldError(
              `Unknown operator: ${(condition as { operator: string }).operator}`,
            );
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
      case "text_isEmpty": {
        const value = this.evaluate(condition.value, processingThread);
        if (value === null || value === undefined) {
          throw new Error(
            "Cannot check if null or undefined text value is empty in text_isEmpty",
          );
        }
        return value.toString().length === 0;
      }
      case "logic_touching": {
        if (condition.target === "MOUSE_POINTER") {
          return this._runtime._renderer.mouseTouchingSprite(
            processingThread.target,
            this._runtime._mouseX,
            this._runtime._mouseY,
          );
        } else if (condition.target === "EDGE") {
          const sprite = processingThread.target;
          let canvas = document.getElementById(
            "foregroundCanvas",
          ) as HTMLCanvasElement;
          if (!canvas) {
            throw new Error(
              "Canvas element not found for logic_touching EDGE check",
            );
          }
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error(
              "Could not get 2D context from canvas for logic_touching EDGE check",
            );
          }
          return this._runtime._renderer.spriteTouchingEdge(
            sprite,
            canvas.width,
            canvas.height,
          );
        }
        const targetSprite = this._runtime._targets.find(
          (sprite) => sprite.id.toString() === condition.target,
        );
        if (!targetSprite) {
          throw new Error(
            `Target sprite not found for logic_touching: ${condition.target}`,
          );
        }
        return this._runtime._renderer.spritesTouching(
          processingThread.target,
          targetSprite,
        );
      }
      case "logic_key_down": {
        const key = condition.key;
        return this._runtime._keyboardKeys.get(key) || false;
      }
      case "logic_mouse_down": {
        return this._runtime._mouseDown;
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
      throw new InvalidFieldError(
        `Field is undefined or null in evaluateValue: ${field}`,
      );
    }
    if (!processingThread) {
      throw new NoProcessingThreadError(
        `Processing thread is undefined or null in evaluateValue: ${JSON.stringify(processingThread)}`,
      );
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
              if (right === 0) {
                throw new Error(`Division by zero in ${left} and ${right}`);
              }
              return left / right;
            case "POWER":
              return Math.pow(left, right);
            default:
              throw new InvalidFieldError(
                `Unknown operator on field: ${field}.`,
              );
              break;
          }
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
              if (input < 0) {
                throw new Error(
                  `Cannot compute square root of negative number for value ${input}`,
                );
              }
              return Math.sqrt(input);
            case "LN":
              if (input <= 0) {
                throw new Error(
                  `Cannot compute natural logarithm for value ${input} because it is not a positive number`,
                );
              }
              return Math.log(input);
            case "LOG10":
              if (input <= 0) {
                throw new Error(
                  `Cannot compute base-10 logarithm for value ${input} because it is not a positive number`,
                );
              }
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
              if (trigInput < -1 || trigInput > 1) {
                throw new Error(`Cannot compute arcsine of value ${trigInput}`);
              }
              return Math.asin(trigInput);
            case "ACOS":
              if (trigInput < -1 || trigInput > 1) {
                throw new Error(
                  `Cannot compute arccosine of value ${trigInput}`,
                );
              }
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

          if (divisor === 0) {
            throw new Error(
              `Division by zero for dividend ${dividend} and divisor ${divisor}`,
            );
          }
          return dividend % divisor;
        case "math_constrain":
          const value = this.evaluate(field.value, processingThread) as number;
          const low = this.evaluate(field.low, processingThread) as number;
          const high = this.evaluate(field.high, processingThread) as number;
          if (low > high) {
            throw new Error(
              `Invalid constraint values: low ${low} is greater than high ${high}`,
            );
          }
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
          for (const borrowedVariableId of processingThread.target.borrowedVariables.keys()) {
            if (borrowedVariableId === variableName) {
              const borrowedVariableValue = this._runtime._targets
                .find(
                  (sprite) =>
                    sprite.id ===
                    processingThread.target.borrowedVariables.get(
                      borrowedVariableId,
                    ),
                )
                ?.variables.get(variableName);
              if (borrowedVariableValue !== undefined) {
                return borrowedVariableValue;
              }
            }
          }
          if (variableValue === undefined) {
            throw new ReferenceError(
              `Variable "${variableName}" is not defined in the current context. Available variables: ${Array.from(
                processingThread.target.variables.keys(),
              ).join(", ")}`,
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
          return processingThread.target.direction % 360;
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
        case "text_length": {
          if (!field.value) {
            throw new InvalidFieldError(
              `Field value is undefined or null in text length: ${JSON.stringify(
                field,
              )}`,
            );
          }
          let result = this.evaluate(field.value, processingThread);
          return result ? result.toString().length : 0;
        }
        case "text_count": {
          if (!field.text || !field.subtext) {
            throw new InvalidFieldError(
              `Field text or substring is undefined or null in text count: ${JSON.stringify(
                field,
              )}`,
            );
            return 0;
          }
          const textValue = this.evaluate(field.text, processingThread);
          const substringValue = this.evaluate(field.subtext, processingThread);
          if (textValue === null || substringValue === null) {
            throw new InvalidFieldError(
              "Cannot count occurrences in null text or substring values in text count",
            );
          }
          const textStr = textValue.toString();
          const substringStr = substringValue.toString();
          if (substringStr.length === 0) {
            return 0; // avoids inf loop
          }
          let count = 0;
          let pos = 0;
          while ((pos = textStr.indexOf(substringStr, pos)) !== -1) {
            count++;
            pos += substringStr.length;
          }
          return count;
        }
        // Screen dimensions
        case "screen_height": {
          return 600;
        }
        case "screen_width": {
          return 800;
        }
        case "screen_sprite_size": {
          return processingThread.target.size;
        }
        case "screen_mouse_x": {
          return this._runtime._mouseX;
        }
        case "screen_mouse_y": {
          return this._runtime._mouseY;
        }
        case "screen_distance_to": {
          if (field.target === "MOUSE_POINTER") {
            const dx = processingThread.target.x - this._runtime._mouseX;
            const dy = processingThread.target.y - this._runtime._mouseY;
            return Math.sqrt(dx * dx + dy * dy);
          } else {
            const targetSprite = this._runtime._targets.find(
              (sprite) => sprite.id.toString() === field.target,
            );
            if (!targetSprite) {
              throw new Error(
                `Target sprite not found for screen distance to: ${field.target}`,
              );
            }
            const dx = processingThread.target.x - targetSprite.x;
            const dy = processingThread.target.y - targetSprite.y;
            return Math.sqrt(dx * dx + dy * dy);
          }
        }
        case "math_round_to": {
          const value = this.evaluate(field.value, processingThread) as number;
          const digits = this.evaluate(
            field.digits,
            processingThread,
          ) as number;
          const factor = Math.pow(10, digits);
          switch (field.operator) {
            case "ROUND":
              return Math.round(value * factor) / factor;
            case "ROUNDUP":
              return Math.ceil(value * factor) / factor;
            case "ROUNDDOWN":
              return Math.floor(value * factor) / factor;
            default:
              throw new InvalidFieldError(
                //@ts-ignore
                `Invalid operator for math round to: ${field.operator}`,
              );
          }
        }
        default:
          throw new InvalidFieldError(
            `Unknown value type: ${(field as { type: string }).type}. ${JSON.stringify(
              field,
            )}`,
          );
      }
    }
    throw new InvalidFieldError(
      "Invalid field value: " + JSON.stringify(field),
    );
  }

  private evaluateText(field: Text, processingThread: Thread): string {
    if (!field) {
      throw new InvalidFieldError(`Field is undefined or null: ${field}`);
    }
    if (!processingThread) {
      throw new NoProcessingThreadError(
        `Processing thread is undefined or null: ${JSON.stringify(processingThread)}`,
      );
    }
    switch (field.type) {
      case "text": {
        return field.value;
      }
      case "text_join": {
        return field.items
          .map((item) => this.evaluate(item, processingThread))
          .join("");
      }
      case "text_charAt": {
        if (!field.value) {
          throw new InvalidFieldError(
            `Field value is undefined or null in text_charAt: ${JSON.stringify(field)}`,
          );
        }
        switch (field.indexType) {
          case "FROM_START": {
            const textValue = this.evaluate(field.value, processingThread);
            const atValue = this.evaluate(field.at, processingThread);
            if (textValue === null || textValue === undefined) {
              throw new InvalidFieldError(
                "Cannot get character from null or undefined text value in text_charAt with indexType FROM_START",
              );
            }
            return textValue
              .toString()
              .charAt(atValue ? parseInt(atValue.toString()) - 1 : 0);
          }
          case "FROM_END": {
            const textValue = this.evaluate(field.value, processingThread);
            const atValue = this.evaluate(field.at, processingThread);
            if (textValue === null || textValue === undefined) {
              throw new InvalidFieldError(
                "Cannot get character from null or undefined text value in text_charAt with indexType FROM_END",
              );
            }
            const indexFromEnd = atValue ? parseInt(atValue.toString()) : 0;
            return textValue
              .toString()
              .charAt(textValue.toString().length - indexFromEnd);
          }
          case "FIRST": {
            const str = this.evaluate(field.value, processingThread);
            if (str === null || str === undefined) {
              throw new InvalidFieldError(
                "Cannot get character from null or undefined text value in text_charAt with indexType FIRST",
              );
            }
            return str.toString().charAt(0);
          }
          case "LAST": {
            const str = this.evaluate(field.value, processingThread);
            if (str === null || str === undefined) {
              throw new InvalidFieldError(
                "Cannot get character from null or undefined text value in text_charAt with indexType LAST",
              );
            }
            return str.toString().charAt(str.toString().length - 1);
          }
          case "RANDOM": {
            const str = this.evaluate(field.value, processingThread);
            if (str === null || str === undefined) {
              throw new InvalidFieldError(
                "Cannot get character from null or undefined text value in text_charAt with indexType RANDOM",
              );
            }
            const randomIndex = Math.floor(
              Math.random() * str.toString().length,
            );
            return str.toString().charAt(randomIndex);
          }
          default:
            throw new InvalidFieldError(
              //@ts-ignore
              `Unknown indexType: ${field.indexType}. ${JSON.stringify(field)}`,
            );
        }
      }
      case "text_changeCase": {
        const textValue = this.evaluate(field.value, processingThread);
        if (textValue === null || textValue === undefined) {
          throw new InvalidFieldError(
            "Cannot change case of null or undefined text value in text_changeCase",
          );
        }
        switch (field.caseType) {
          case "UPPERCASE":
            return textValue.toString().toUpperCase();
          case "LOWERCASE":
            return textValue.toString().toLowerCase();
          case "TITLECASE":
            return textValue.toString().replace(/\w\S*/g, (txt) => {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
          default:
            throw new InvalidFieldError(
              //@ts-ignore
              `Unknown caseType: ${field.caseType}. ${JSON.stringify(field)}`,
            );
        }
      }
      case "text_trim": {
        const textValue = this.evaluate(field.value, processingThread);
        if (textValue === null || textValue === undefined) {
          throw new InvalidFieldError(
            "Cannot trim null or undefined text value in text_trim",
          );
        }
        switch (field.mode) {
          case "BOTH":
            return textValue.toString().trim();
          case "LEFT":
            return textValue.toString().replace(/^\s+/, "");
          case "RIGHT":
            return textValue.toString().replace(/\s+$/, "");
          default:
            throw new InvalidFieldError(
              //@ts-ignore
              `Unknown mode: ${field.mode}. ${JSON.stringify(field)}`,
            );
        }
      }
      case "text_replace": {
        const textValue = this.evaluate(field.text, processingThread);
        const fromValue = this.evaluate(field.from, processingThread);
        const toValue = this.evaluate(field.to, processingThread);
        if (
          textValue === null ||
          textValue === undefined ||
          fromValue === null ||
          fromValue === undefined ||
          toValue === null ||
          toValue === undefined
        ) {
          throw new InvalidFieldError(
            "Cannot replace in null or undefined text value in text_replace",
          );
        }
        // The regex escaping code below is taken from the implementation of
        // goog.string.regExpEscape.
        const filteredFromValue = fromValue
          .toString()
          .replace(/([-()\[\]{}+?*.$^|,:#<!\\\\])/g, "\\$1")
          .replace(/\\x08/g, "\\\\x08");
        const regex = new RegExp(filteredFromValue, "g");
        return textValue.toString().replace(regex, toValue.toString());
      }
      case "text_reverse": {
        const textValue = this.evaluate(field.value, processingThread);
        if (textValue === null || textValue === undefined) {
          throw new InvalidFieldError(
            "Cannot reverse null or undefined text value in text_reverse",
          );
        }
        return textValue.toString().split("").reverse().join("");
      }
      default:
        throw new InvalidFieldError(
          //@ts-ignore
          `Unknown text type: ${field.type}. ${JSON.stringify(field)}`,
        );
    }
  }

  evaluate(
    field: Value | Condition | Text,
    processingThread: Thread,
  ): number | string | boolean | null {
    try {
      if (!field) {
        throw new InvalidFieldError(`Field is undefined or null: ${field}`);
      }
      if (typeof field === "object" && "type" in field && field !== null) {
        if (valueTypes.includes(field.type as ValueType)) {
          return this.evaluateValue(field as Value, processingThread);
        } else if (conditionTypes.includes(field.type as ConditionType)) {
          return this.evaluateCondition(field as Condition, processingThread);
        } else if (textTypes.includes(field.type as TextType)) {
          return this.evaluateText(field as Text, processingThread);
        } else {
          throw new InvalidFieldError(
            `Unknown field type: ${field.type}. ${JSON.stringify(field)}`,
          );
        }
      } else {
        throw new InvalidFieldError(
          "Invalid field value: " + JSON.stringify(field),
        );
      }
    } catch (error) {
      this._runtime.setRuntimeError(error, "Evaluation error");
      throw error;
    }
  }
}
