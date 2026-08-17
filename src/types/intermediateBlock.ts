import { Value, Condition, Text } from "@/types/field";

export type IntermediateBlock =
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
      body: IntermediateBlock[];
    }
  | {
      type: "controls_if";
      condition: Condition;
      // of course there can be more thenbodies and conditions i just dont know how to type them yet
      thenBody: IntermediateBlock[];
      elseBody?: IntermediateBlock[];
    }
  | {
      type: "controls_flow_statements";
      flow: "BREAK" | "CONTINUE";
    }
  | {
      type: "procedures_callnoreturn";
      name: string;
      arguments: { name: string; value: Value }[];
    }
  | {
      type: "controls_whileUntil";
      mode: "WHILE" | "UNTIL";
      condition: Condition;
      body: IntermediateBlock[];
    }
  | {
      type: "controls_for";
      variable: string;
      from: Value;
      to: Value;
      by: Value;
      body: IntermediateBlock[];
    }
  // | {
  //     type: "controls_forEach";
  //     variable: string;
  //     list: Value;
  //     body: IntermediateBlock[];
  //   }
  | {
      type: "screen_change_x";
      delta: Value;
    }
  | {
      type: "screen_change_y";
      delta: Value;
    }
  | {
      type: "screen_rotate_clockwise";
      degrees: Value;
    }
  | {
      type: "screen_rotate_counterclockwise";
      degrees: Value;
    }
  | {
      type: "screen_set_rotation";
      degrees: Value;
    }
  | {
      type: "screen_next_costume";
    }
  | {
      type: "screen_set_costume";
      costume: string;
    }
  | {
      type: "screen_show";
    }
  | {
      type: "screen_hide";
    }
  | {
      type: "screen_set_size";
      size: Value;
    }
  | {
      type: "screen_change_size";
      delta: Value;
    }
  | {
      type: "text_append";
      text: Text | Value;
      variableName: string;
    }
  | {
      type: "events_broadcast";
      message: string;
    };
