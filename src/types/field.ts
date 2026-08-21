import { IntermediateBlock } from "./intermediateBlock";

export type Value =
  | {
      type: "math_arithmetic";
      operator: "ADD" | "MINUS" | "MULTIPLY" | "DIVIDE" | "POWER";
      left: Value;
      right: Value;
    }
  | {
      type: "math_single";
      operator: "NEG" | "ABS" | "ROOT" | "LN" | "LOG10" | "EXP" | "POW10";
      operand: Value;
    }
  | {
      type: "math_trig";
      operator: "SIN" | "COS" | "TAN" | "ASIN" | "ACOS" | "ATAN";
      operand: Value;
    }
  | {
      type: "math_constant";
      constant: "PI" | "E" | "GOLDEN_RATIO" | "SQRT2" | "SQRT1_2" | "INFINITY";
    }
  | {
      type: "math_round";
      operator: "ROUND" | "ROUNDUP" | "ROUNDDOWN";
      operand: Value;
    }
  | {
      type: "math_number";
      value: number;
    }
  | {
      type: "math_modulo";
      dividend: Value;
      divisor: Value;
    }
  | {
      type: "math_constrain";
      value: Value;
      low: Value;
      high: Value;
    }
  | {
      type: "math_random_int";
      from: Value;
      to: Value;
    }
  | {
      type: "math_random_float";
    }
  | {
      type: "math_atan2";
      y: Value;
      x: Value;
    }
  | {
      type: "variables_get";
      name: string;
    }
  | {
      type: "screen_position_x";
    }
  | {
      type: "screen_position_y";
    }
  | {
      type: "screen_rotation";
    }
  | {
      type: "logic_ternary";
      condition: Condition;
      trueValue: Value;
      falseValue: Value;
    }
  | {
      type: "text_length";
      value: Text | Value;
    }
  | {
      type: "text_count";
      text: Text | Value;
      subtext: Text | Value;
    };

export const valueTypes = [
  "math_arithmetic",
  "math_single",
  "math_trig",
  "math_constant",
  "math_round",
  "math_number",
  "math_modulo",
  "math_constrain",
  "math_random_int",
  "math_random_float",
  "math_atan2",
  "variables_get",
  "screen_position_x",
  "screen_position_y",
  "screen_rotation",
  "logic_ternary",
  "text_length",
  "text_count",
] as const;

export type ValueType = (typeof valueTypes)[number];

export type Condition =
  | {
      type: "logic_compare";
      operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE";
      left: Value;
      right: Value;
    }
  | {
      type: "logic_operation";
      operator: "AND" | "OR";
      left: Condition;
      right: Condition;
    }
  | {
      type: "logic_negate";
      operand: Condition;
    }
  | {
      type: "logic_boolean";
      value: boolean;
    }
  | {
      type: "logic_null";
      value: null;
    }
  | {
      type: "text_isEmpty";
      value: Text | Value;
    }
  | {
      type: "logic_touching";
      target: string | "MOUSE_POINTER" | "EDGE";
    };

export const conditionTypes = [
  "logic_compare",
  "logic_operation",
  "logic_negate",
  "logic_boolean",
  "logic_null",
  "text_isEmpty",
  "logic_touching",
] as const;

export type ConditionType = (typeof conditionTypes)[number];

export type Text =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "text_join";
      items: (Text | Value)[];
    }
  | {
      type: "text_charAt";
      value: Text | Value;
      indexType: "FROM_START" | "FROM_END" | "FIRST" | "LAST" | "RANDOM";
      at: Value;
    }
  | {
      type: "text_changeCase";
      value: Text | Value;
      caseType: "UPPERCASE" | "LOWERCASE" | "TITLECASE";
    }
  | {
      type: "text_trim";
      value: Text | Value;
      mode: "BOTH" | "LEFT" | "RIGHT";
    }
  | {
      type: "text_replace";
      text: Text | Value;
      from: Text | Value;
      to: Text | Value;
    }
  | {
      type: "text_reverse";
      value: Text | Value;
    };

export const textTypes = [
  "text",
  "text_join",
  "text_charAt",
  "text_changeCase",
  "text_trim",
  "text_replace",
  "text_reverse",
] as const;

export type TextType = (typeof textTypes)[number];

export type ProcedureParameter = {
  name: string;
  id: string;
};

export type Procedure = {
  name: string;
  parameters: ProcedureParameter[];
  body: IntermediateBlock[];
  returnValue: Value | null;
};

export type ProcedureCallArgument = {
  name: string;
  value: number | string | boolean; // arguments should be evaluated before being passed to the procedure otherwise there are crazy side effects
};
