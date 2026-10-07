import { Script } from "@/runner/script";
import * as Blockly from "blockly";
import { intermediateGenerator } from "@/generators/intermediateGenerator";
import { Thread } from "./thread";
import { Sprite } from "@/runner/sprite";
import { DatabaseBackdrop, DatabaseSprite } from "@/types/database";
import { VirtualMachine } from "./virtualMachine";
import { Renderer } from "./renderer";
import { Procedure } from "@/types/field";
import { MultipleBackdropError } from "@/types/errors";

export class Runtime {
  _targets: Sprite[] = [];
  _threads: Thread[] = [];
  _scripts: Script[] = [];
  _keyboardKeys: Map<string, boolean> = new Map();
  _mouseDown: boolean = false;
  _vm: VirtualMachine;
  _mouseX: number = 1000; // so that sprites at 0,0 dont get triggered by mouse down
  _mouseY: number = 1000;
  _nextCloneId = 1;
  _renderer: Renderer;
  _lastError: string | null = null;
  private _errorHandler?: (message: string) => void;

  constructor(
    sprites: (DatabaseSprite | DatabaseBackdrop)[],
    onImageLoaded?: () => void,
  ) {
    console.warn("Runtime initialized with sprites:", sprites);
    this._vm = new VirtualMachine(this);
    this._renderer = new Renderer();
    for (const databaseSprite of sprites) {
      const spriteWorkspace = new Blockly.Workspace();
      // if ("isBackdrop" in databaseSprite && databaseSprite.isBackdrop) {
      //   continue;
      // }
      console.log(databaseSprite);
      for (const block of databaseSprite.blocks_json) {
        Blockly.serialization.blocks.append(block, spriteWorkspace);
      }
      let sprite = null;
      sprite = new Sprite(
        //@ts-ignore
        databaseSprite.image_paths || [],
        onImageLoaded,
      );
      if ("isBackdrop" in databaseSprite && databaseSprite.isBackdrop) {
        if (this._targets.find((s) => s.id < 0)) {
          throw new MultipleBackdropError(
            "Multiple backdrops found in project",
          );
        }
        sprite.isBackdrop = true;
        sprite.x = 800 / 2;
        sprite.y = 600 / 2;
      } else {
        sprite.isBackdrop = false;
        sprite.x = 800 / 2;
        sprite.y = 600 / 2;
      }
      sprite.id = databaseSprite.id;
      for (const thing of databaseSprite.variables_map) {
        sprite.variables.set(thing.id, 0);
        if (thing.isGlobal) {
          sprite.globalVariableNames.add(thing.id);
        } else {
          sprite.localVariableNames.add(thing.id);
        }
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
      this._nextCloneId = Math.max(this._nextCloneId, sprite.id + 1);
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
          // console.warn(
          //   "Found top-level event block for sprite",
          //   sprite.id,
          //   "of type",
          //   block.type,
          // );
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
    key = key.replace(" ", "SPACE").toUpperCase();
    this._keyboardKeys.set(key, true);
    for (const script of this._scripts) {
      if (
        script.trigger.type === "key_pressed" &&
        script.trigger.value === key
      ) {
        // console.log("Starting script for key press:", script);
        this.startScript(script);
      }
    }
  }

  keyReleased(key: string) {
    key = key.replace(" ", "SPACE").toUpperCase();
    this._keyboardKeys.set(key, false);
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
    const clickedTarget = this._renderer.spriteAt(this._targets, x, 600 - y);
    if (!clickedTarget) {
      return;
    }

    const scriptOwnerId = (
      clickedTarget.cloneSourceId ?? clickedTarget.id
    ).toString();
    for (const script of this._scripts) {
      if (
        script.trigger.type === "sprite_clicked" &&
        script.targetId === scriptOwnerId
      ) {
        this.startScriptForTarget(script, clickedTarget);
      }
    }
  }

  setErrorHandler(handler: (message: string) => void) {
    this._errorHandler = handler;
  }

  clearError() {
    this._lastError = null;
  }

  setRuntimeError(error: unknown, context?: string) {
    const formattedError =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === "string"
          ? error
          : JSON.stringify(error, null, 2) || "Unknown runtime error";

    const message = context ? `${context}: ${formattedError}` : formattedError;
    this._lastError = message;
    this._errorHandler?.(message);
  }

  tick(deltaTime: number, currentTime: number) {
    for (const thread of this._threads) {
      // console.log(
      //   `Thread for sprite ${thread.target.id} is in status: ${thread.status}`,
      // );
      this._vm.step(thread, currentTime, deltaTime);
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
      this.startScriptForTarget(script, target);
    } else {
      console.error("Target not found for script:", script);
    }
  }

  private startScriptForTarget(script: Script, target: Sprite) {
    const thread = new Thread(target, script);
    this._threads.push(thread);
  }

  createClone(source: Sprite): Sprite {
    const clone = Sprite.cloneOf(source, this._nextCloneId++);
    this._targets.push(clone);
    console.log(
      `Created clone of sprite ${source.id} with new id ${clone.id}. Clone:`,
      clone,
    );
    return clone;
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

  render() {
    this._renderer.blit(this._targets);
  }

  setMousePosition(x: number, y: number) {
    this._mouseX = x;
    this._mouseY = 600 - y;
  }
  getMousePosition(): { x: number; y: number } {
    return { x: this._mouseX, y: this._mouseY };
  }
}
