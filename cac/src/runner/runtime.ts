import { Script } from "@/runner/script";
import * as Blockly from "blockly";
import { intermediateGenerator } from "@/generators/intermediate";
import { Thread } from "./thread";
import { Sprite } from "@/runner/sprite";
import { AssetDatabaseSprite, DatabaseSprite } from "@/types/sprite";
import { VirtualMachine } from "./virtualMachine";
import { Renderer } from "./renderer";

export class Runtime {
  _targets: Sprite[] = [];
  _threads: Thread[] = [];
  _scripts: Script[] = [];
  _vm: VirtualMachine;
  _renderer: Renderer;

  constructor(sprites: AssetDatabaseSprite[]) {
    this._vm = new VirtualMachine();
    this._renderer = new Renderer();
    for (const databaseSprite of sprites) {
      const spriteWorkspace = new Blockly.Workspace();
      for (const block of JSON.parse(databaseSprite.blocks_json || "[]")) {
        Blockly.serialization.blocks.append(block, spriteWorkspace);
      }
      let sprite = new Sprite(
        sprites.find((s) => s.id === databaseSprite.id)?.loadableImagePaths ||
          [],
      );
      sprite.id = databaseSprite.id;
      this._targets.push(sprite);
      let topBlocks = spriteWorkspace.getTopBlocks(false);
      for (const block of topBlocks) {
        let outputScript = this.compileScript(sprite.id, block);
        if (outputScript) {
          this._scripts.push(outputScript);
        }
      }
      spriteWorkspace.dispose();
    }
  }
  compileScript(spriteId: number, block: Blockly.Block): Script | null {
    const script = new Script();

    if (block.type === "when_started") {
      script.trigger.type = "start";
    } else if (block.type === "when_key_pressed") {
      script.trigger.type = "key_pressed";
      script.trigger.value = block.getFieldValue("KEY");
    } else if (block.type === "when_broadcast_received") {
      script.trigger.type = "broadcast";
      script.trigger.value = block.getFieldValue("BROADCAST_OPTION");
    } else {
      return null;
    }

    script.targetId = spriteId.toString();

    script.blocks = JSON.parse(
      "[" + intermediateGenerator.blockToCode(block) + "]",
    );

    return script;
  }

  keyPressed(key: string) {
    for (const script of this._scripts) {
      if (
        script.trigger.type === "key_pressed" &&
        script.trigger.value === key
      ) {
        this.startScript(script);
      }
    }
  }

  tick(deltaTime: number) {
    for (const thread of this._threads) {
      this._vm.step(thread, this, deltaTime);
    }
    this._threads = this._threads.filter((thread) => thread.status !== "done");
    this._renderer.blit(this._targets);
  }

  broadcastReceived(broadcast: string) {
    for (const script of this._scripts) {
      if (
        script.trigger.type === "broadcast" &&
        script.trigger.value === broadcast
      ) {
        this.startScript(script);
      }
    }
  }

  startScript(script: Script) {
    const target = this._targets.find(
      (t) => t.id.toString() === script.targetId,
    );
    if (target) {
      const thread = new Thread(target, script);
      this._threads.push(thread);
    } else {
      console.error("Target not found for script:", script);
    }
  }
  start() {
    for (const script of this._scripts) {
      if (script.trigger.type === "start") {
        this.startScript(script);
      }
    }
  }

  stopAll() {
    this._threads = [];
  }
}
