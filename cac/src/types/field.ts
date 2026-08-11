export type Value =
  | {
      type: "math_arithmetic";
      operator: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE" | "POWER";
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
    };

export type Predicate =
  | {
      type: "logic_compare";
      operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE";
      left: Value;
      right: Value;
    }
  | {
      type: "logic_operation";
      operator: "AND" | "OR";
      left: Predicate;
      right: Predicate;
    }
  | {
      type: "logic_negate";
      operand: Predicate;
    }
  | {
      type: "logic_boolean";
      value: boolean;
    }
  | {
      type: "logic_null";
      value: null;
    };
