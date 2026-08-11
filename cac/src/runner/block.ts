import { Value, Predicate } from "@/types/field";

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
      condition: Predicate;
    };
