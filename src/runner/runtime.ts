import { Script } from "@/runner/script";
import * as Blockly from "blockly";
import { intermediateGenerator } from "@/generators/intermediateGenerator";
import { Thread } from "./thread";
import { Sprite } from "@/runner/sprite";
import { DatabaseSprite } from "@/types/databaseSprite";
import { VirtualMachine } from "./virtualMachine";
import { Renderer } from "./renderer";
import { Procedure } from "@/types/field";

export class Runtime {
  _targets: Sprite[] = [];
  _threads: Thread[] = [];
  _scripts: Script[] = [];
  _vm: VirtualMachine;
  _renderer: Renderer;

  constructor(sprites: DatabaseSprite[]) {
    this._vm = new VirtualMachine(this);
    this._renderer = new Renderer();
    for (const databaseSprite of sprites) {
      const spriteWorkspace = new Blockly.Workspace();
      for (const block of databaseSprite.blocks_json) {
        Blockly.serialization.blocks.append(block, spriteWorkspace);
      }
      let sprite = new Sprite(
        sprites.find((s) => s.id === databaseSprite.id)?.image_paths || [],
      );
      sprite.id = databaseSprite.id;
      for (const thing of databaseSprite.variables_map) {
        sprite.variables.set(thing.id, 0);
        console.log(
          `Sprite ${sprite.id} has variable ${thing.name} with id ${thing.id}`,
        );
      }
      for (const otherSprite of sprites) {
        if (otherSprite.id !== databaseSprite.id) {
          for (const variable of otherSprite.variables_map) {
            if (variable.isGlobal) {
              sprite.borrowedVariables.set(variable.id, otherSprite.id);
              console.log(
                `Sprite ${sprite.id} borrowed variable ${variable.name} from sprite ${otherSprite.id}`,
              );
            }
          }
        }
      }
      this._targets.push(sprite);
      let topBlocks = spriteWorkspace.getTopBlocks(false);
      for (const block of topBlocks) {
        if (
          block.type === "procedures_defnoreturn" ||
          block.type === "procedures_defreturn"
        ) {
          const generated = JSON.parse(
            //@ts-ignore
            intermediateGenerator.blockToCode(block),
          );
          console.log("Generated procedure definition:", generated);
          sprite.procedures.set(block.getFieldValue("NAME"), {
            name: block.getFieldValue("NAME"),
            parameters: generated.parameters,
            body: generated.body,
            returnValue: generated.returnValue || null,
          } as Procedure);
        } else if (
          block.type === "events_when_started" ||
          block.type === "events_when_key_pressed" ||
          block.type === "events_when_broadcast_received" ||
          block.type === "events_when_sprite_clicked"
        ) {
          let outputScript = this.compileScript(sprite.id, block);
          if (outputScript) {
            this._scripts.push(outputScript);
          }
        }
      }
      console.log(sprite);
      spriteWorkspace.dispose();
    }
  }
  compileScript(spriteId: number, block: Blockly.Block): Script | null {
    const script = new Script();
    if (block.type === "events_when_started") {
      script.trigger.type = "start";
    } else if (block.type === "events_when_key_pressed") {
      script.trigger.type = "key_pressed";
      script.trigger.value = block.getFieldValue("KEY");
    } else if (block.type === "events_when_broadcast_received") {
      script.trigger.type = "broadcast";
      script.trigger.value = block.getFieldValue("BROADCAST");
    } else if (block.type === "events_when_sprite_clicked") {
      script.trigger.type = "sprite_clicked";
    } else {
      return null;
    }

    script.targetId = spriteId.toString();

    script.blocks = JSON.parse(
      "[" + intermediateGenerator.blockToCode(block) + "]",
    );
    console.log("Compiled script for sprite", spriteId, ":", script);
    return script;
  }

  keyPressed(key: string) {
    for (const script of this._scripts) {
      if (
        script.trigger.type === "key_pressed" &&
        script.trigger.value === key.toUpperCase()
      ) {
        // console.log("Starting script for key press:", script);
        this.startScript(script);
      }
    }
  }

  broadcast(broadcast: string) {
    for (const script of this._scripts) {
      if (
        script.trigger.type === "broadcast" &&
        script.trigger.value === broadcast
      ) {
        // console.log("Starting script for broadcast:", script);
        this.startScript(script);
      }
    }
  }

  screenClick(x: number, y: number) {
    console.log("Screen clicked at:", x, y);
    for (const script of this._scripts) {
      if (script.trigger.type === "sprite_clicked") {
        const canvas = document.getElementById(
          "foregroundCanvas",
        ) as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("Could not get 2D context from canvas");
          return;
        }
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        if (pixelData[3] === 0) {
          // Clicked on transparent pixel, ignore
          continue;
        }
        let xMin =
          this._targets.find((t) => t.id.toString() === script.targetId)?.x ||
          0;
        let yMin =
          this._targets.find((t) => t.id.toString() === script.targetId)?.y ||
          0;
        let currentCostumeIndex =
          this._targets.find((t) => t.id.toString() === script.targetId)
            ?.currentCostumeIndex || 0;
        let xMax =
          xMin +
          (this._targets.find((t) => t.id.toString() === script.targetId)
            ?._costumes[currentCostumeIndex].width || 0);
        let yMax =
          yMin +
          (this._targets.find((t) => t.id.toString() === script.targetId)
            ?._costumes[currentCostumeIndex].height || 0);
        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          this.startScript(script);
        }
      }
    }
  }

  tick(deltaTime: number, currentTime: number) {
    for (const thread of this._threads) {
      this._vm.step(thread, currentTime,deltaTime);
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
