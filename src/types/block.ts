import { Value, Condition } from "@/types/field";

export type Block =
  | {
      type: "screen_set_position";
      x: Value;
      y: Value;
    }
  | {
      type: "screen_set_x";
      x: Value;
    }
  | {
      type: "screen_set_y";
      y: Value;
    }
  | {
      type: "logic_wait";
      duration: Value;
    }
  | {
      type: "variables_set";
      name: string;
      value: Value;
    }
  | {
      type: "math_change";
      name: string;
      value: Value;
    }
  | {
      type: "controls_repeat_ext";
      times: Value;
      body: Block[];
    }
  | {
      type: "controls_if";
      condition: Condition;
      // of course there can be more thenbodies and conditions i just dont know how to type them yet
      thenBody: Block[];
      elseBody?: Block[];
    }
  | {
      type: "controls_flow_statements";
      flow: "BREAK" | "CONTINUE";
    }
  | {
      type: "procedures_callnoreturn";
      name: string;
      arguments: { name: string; value: Value }[];
    };
