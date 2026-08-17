import { IntermediateBlock } from "@/types/intermediateBlock";

export interface ScriptInterface {
  id: string;
  targetId: string;

  trigger: {
    type: "start" | "key_pressed" | "broadcast" | "sprite_clicked";
    value?: string;
  };

  blocks: IntermediateBlock[];
}

export class Script implements ScriptInterface {
  id: string;
  targetId: string;
  trigger: {
    type: "start" | "key_pressed" | "broadcast" | "sprite_clicked";
    value?: string;
  };
  blocks: IntermediateBlock[];

  constructor() {
    this.id = crypto.randomUUID();
    this.targetId = "";
    this.trigger = {
      type: "start",
    };
    this.blocks = [];
  }
}
