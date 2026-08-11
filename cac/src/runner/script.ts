import { Block } from "@/types/block";

export interface ScriptInterface {
  id: string;
  targetId: string;

  trigger: {
    type: "start" | "key_pressed" | "broadcast";
    value?: string;
  };

  blocks: Block[];
}

export class Script implements ScriptInterface {
  id: string;
  targetId: string;
  trigger: {
    type: "start" | "key_pressed" | "broadcast";
    value?: string;
  };
  blocks: Block[];

  constructor() {
    this.id = crypto.randomUUID();
    this.targetId = "";
    this.trigger = {
      type: "start",
    };
    this.blocks = [];
  }
}
