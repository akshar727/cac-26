import "./App.css";
import * as React from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as Blockly from "blockly";
import { blocks } from "./blocks/blocks";
import { toolbox } from "./toolbox";
import { loops } from "blockly/blocks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { BlocklyVariablePromptDialog } from "./components/BlocklyVariablePromptDialog";
import { Button } from "./components/ui/button";
import { useRef } from "react";
import { shadowBlockConversionChangeListener } from "@blockly/shadow-block-converter";
import { registerContinuousToolbox } from "@blockly/continuous-toolbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { Slider } from "@/components/ui/slider";
import { DatabaseBackdrop, DatabaseSprite } from "@/types/database";
import { Runtime } from "@/runner/runtime";
import { DatabaseManager } from "./lib/database";
import CostumeEditor from "./components/CostumeEditor";
import BroadcastPromptDialog from "./components/BroadcastPromptDialog";
import SpriteAndBackdropSelector from "./components/SpriteBackdropSelector";
import { Play, RotateCcw, Square, Undo2 } from "lucide-react";
import { BlocklyHelp } from "./components/BlocklyHelp";
import {
  getBlocklyTheme,
  watchPastelTextContrast,
} from "./blocks/theme";
import type { AccessibilitySettings } from "./lib/settings";
import { registerExtensions, unregisterExtensions } from "./lib/extensions";
import { RuntimeErrorDialog } from "./components/RuntimeErrorDialog";
import { Label } from "./components/ui/label";

type RuntimeSnapshotTarget = {
  id: number;
  cloneSourceId: number | null;
  x: number;
  y: number;
  direction: number;
  size: number;
  currentCostumeIndex: number;
  variables: Record<string, number | string | boolean>;
};

type RuntimeSnapshot = {
  time: number;
  targets: RuntimeSnapshotTarget[];
};

function CodeEditor({
  projectId,
  cb,
  pastelTheme,
  accessibilitySettings,
}: {
  projectId: number | null;
  cb: () => void;
  pastelTheme: boolean;
  accessibilitySettings: AccessibilitySettings;
}) {
  const activeSpriteRef = useRef<(DatabaseSprite | DatabaseBackdrop) | null>(
    null,
  );
  const [workspace, setWorkspace] = React.useState<Blockly.WorkspaceSvg | null>(
    null,
  );
  const [activeSprite, setActiveSprite] = React.useState<
    (DatabaseSprite | DatabaseBackdrop) | null
  >(null);
  const [sprites, setSprites] = React.useState<
    (DatabaseSprite | DatabaseBackdrop)[]
  >([]);
  const [spriteImageDialogValue, setSpriteImageDialogValue] = React.useState<
    string | null
  >(null);
  const [spriteNameDialogValue, setSpriteNameDialogValue] = React.useState<
    string | null
  >(null);
  const [spriteDialogOpen, setSpriteDialogOpen] = React.useState(false);
  const _appDataDir = React.useRef<string | null>(null);
  const codeRunning = React.useRef(false);
  const runtimeRef = React.useRef<Runtime | null>(null);
  const [codeRunningState, setCodeRunningState] = React.useState(false);
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const broadcastMessagesRef = useRef<[string, string][]>([]);
  const spritesRef = useRef(sprites);
  const runtimeActiveRef = useRef(false);
  const runIdRef = useRef(0);
  const runCleanupRef = useRef<(() => void) | null>(null);
  const snapshotsRef = useRef<RuntimeSnapshot[]>([]);
  const snapshotFrameRef = useRef(0);
  const [snapshotCount, setSnapshotCount] = React.useState(0);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = React.useState(0);
  const [runtimeTick, setRuntimeTick] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("blocks");

  React.useEffect(() => {
    codeRunning.current = codeRunningState;
  }, [codeRunningState]);

  // change ref
  React.useEffect(() => {
    activeSpriteRef.current = activeSprite;
  }, [activeSprite]);

  React.useEffect(() => {
    spritesRef.current = sprites;
  }, [sprites]);

  React.useEffect(() => {
    return () => {
      codeRunning.current = false;
      runIdRef.current += 1;
      runCleanupRef.current?.();
      runCleanupRef.current = null;
      runtimeRef.current?.stopAll();
    };
  }, []);

  function snapshotRuntime(runtime: Runtime, time: number): RuntimeSnapshot {
    return {
      time,
      targets: runtime._targets.map((target) => ({
        id: target.id,
        cloneSourceId: target.cloneSourceId,
        x: target.x,
        y: target.y,
        direction: target.direction,
        size: target.size,
        currentCostumeIndex: target.currentCostumeIndex,
        variables: Object.fromEntries(target.variables.entries()),
      })),
    };
  }

  function publishSnapshotState() {
    const length = snapshotsRef.current.length;
    setSnapshotCount(length);
    setSelectedSnapshotIndex(Math.max(0, length - 1));
    setRuntimeTick((value) => value + 1);
  }

  function recordRuntimeSnapshot(runtime: Runtime, time: number) {
    const TIMELINE_MAX_FRAMES = 20000;
    const TRIM_SLACK = 500;
    const snapshots = snapshotsRef.current;
    snapshots.push(snapshotRuntime(runtime, time));
    if (snapshots.length > TIMELINE_MAX_FRAMES + TRIM_SLACK) {
      snapshots.splice(0, snapshots.length - TIMELINE_MAX_FRAMES);
    }
    snapshotFrameRef.current += 1;
    if (snapshotFrameRef.current % 6 === 1) publishSnapshotState();
  }

  function restoreRuntimeSnapshot(index: number) {
    const snapshot = snapshotsRef.current[index];
    const runtime = runtimeRef.current;
    if (!runtime || !snapshot) return;
    runtimeActiveRef.current = false;
    codeRunning.current = false;
    setCodeRunningState(false);
    runtime._threads = [];
    runtime._targets = runtime._targets.filter((target) =>
      snapshot.targets.some((savedTarget) => savedTarget.id === target.id),
    );
    for (const savedTarget of snapshot.targets) {
      const target = runtime._targets.find(
        (candidate) => candidate.id === savedTarget.id,
      );
      if (!target) continue;
      target.cloneSourceId = savedTarget.cloneSourceId;
      target.x = savedTarget.x;
      target.y = savedTarget.y;
      target.direction = savedTarget.direction;
      target.size = savedTarget.size;
      target.currentCostumeIndex = savedTarget.currentCostumeIndex;
      target.variables = new Map(Object.entries(savedTarget.variables));
    }
    runtime._renderer.blit(runtime._targets);
    setSelectedSnapshotIndex(index);
    setRuntimeTick((value) => value + 1);
  }

  // this effect should only add stuff into the workspace, not fetch data.
  React.useEffect(() => {
    (async () => {
      if (!Blockly.getMainWorkspace()) return;
      Blockly.Events.disable();
      try {
        Blockly.getMainWorkspace().clear();
        if (!activeSprite || !activeSprite?.blocks_json) return;
        Blockly.getMainWorkspace().getVariableMap().clear();
        for (const variable of activeSprite.variables_map) {
          Blockly.getMainWorkspace()
            .getVariableMap()
            .createVariable(variable.name, undefined, variable.id);
        }
        for (const otherSprite of sprites) {
          if (otherSprite.id === activeSprite.id) continue;
          for (const variable of otherSprite.variables_map) {
            if (variable.isGlobal) {
              Blockly.getMainWorkspace()
                .getVariableMap()
                .createVariable(variable.name, undefined, variable.id);
            }
          }
        }
        for (const block of activeSprite.blocks_json) {
          Blockly.serialization.blocks.append(
            block,
            Blockly.getMainWorkspace(),
          );
        }
        (
          Blockly.getMainWorkspace() as Blockly.WorkspaceSvg
        ).refreshToolboxSelection();
        (Blockly.getMainWorkspace() as Blockly.WorkspaceSvg).cleanUp();
      } finally {
        Blockly.Events.enable();
      }
    })();
  }, [activeSprite, workspace]);
  // runs only on mount
  React.useEffect(() => {
    // Register the blocks and generator with Blockly
    async function setup() {
      await importDatabaseData();
      await setupWorkspace();
      _appDataDir.current = await appLocalDataDir();
    }
    setup();
  }, []);

  async function importDatabaseData() {
    const projects = await new DatabaseManager().getProjects();
    let spritesResult = await new DatabaseManager().getSpritesForProject(
      projectId || projects[0].id,
    );
    let backdropsResult = await new DatabaseManager().getBackdropsForProject(
      projectId || projects[0].id,
    );
    let combined: (DatabaseSprite | DatabaseBackdrop)[] = [
      ...spritesResult,
      ...backdropsResult,
    ];
    setSprites(combined);
    if (!activeSprite && spritesResult.length > 0) {
      setActiveSprite(spritesResult[0]);
      console.log("Active sprite set to:", spritesResult[0]);
      console.log("All sprites:", spritesResult);
    } else {
      setActiveSprite((prevActiveSprite) => {
        if (prevActiveSprite && !("isBackdrop" in prevActiveSprite)) {
          const updatedSprite = spritesResult.find(
            (sprite) => sprite.id === prevActiveSprite.id,
          );
          return updatedSprite || null;
        } else if (prevActiveSprite && "isBackdrop" in prevActiveSprite) {
          const updatedBackdrop = backdropsResult.find(
            // looking in diff results here
            (backdrop) => backdrop.id === prevActiveSprite.id,
          );
          return updatedBackdrop || null;
        }
        console.warn(
          "Active sprite not found in updated sprites, setting to null",
        );
        return null;
      });
    }
    let broadcastMessages =
      await new DatabaseManager().getProjectBroadcastMessages(
        projectId || projects[0].id,
      );
    broadcastMessagesRef.current = broadcastMessages as [string, string][];
  }

  const saveThumbnail = async () => {
    const canvas = document.getElementById(
      "foregroundCanvas",
    ) as HTMLCanvasElement;
    const bgCanvas = document.getElementById(
      "backgroundCanvas",
    ) as HTMLCanvasElement;
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = canvas.width;
    combinedCanvas.height = canvas.height;
    const ctx = combinedCanvas.getContext("2d");
    ctx?.drawImage(bgCanvas, 0, 0);
    ctx?.drawImage(canvas, 0, 0);
    const finalUrl = combinedCanvas.toDataURL("image/png");
    try {
      // Extract the base64 string part"
      const base64Data = finalUrl.split(",")[1];

      // Decode the base64 string into binary data
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const appDir = await appLocalDataDir();

      const filePath = await join(appDir, `proj_${projectId}`, "thumbnail.png");

      await writeFile(filePath, bytes);

      console.log(`Thumbnail saved to: ${filePath}`);
    } catch (error) {
      console.error("Failed to save thumbnail:", error);
    }
  };

  const runCode = () => {
    if (!Blockly.getMainWorkspace()) return;

    runIdRef.current += 1;
    runCleanupRef.current?.();
    runCleanupRef.current = null;
    const myRunId = runIdRef.current;
    const canvas = document.getElementById(
      "foregroundCanvas",
    ) as HTMLCanvasElement | null;
    if (
      canvas === null ||
      document.getElementById("backgroundCanvas") === null
    ) {
      codeRunning.current = false;
      setCodeRunningState(false);
      setRuntimeError(
        "The Screen tab is not ready yet. Open the Screen tab and press Run Code again.",
      );
      return;
    }
    Blockly.Events.disable();
    try {
      setRuntimeError(null);
      snapshotsRef.current = [];
      snapshotFrameRef.current = 0;
      setSnapshotCount(0);
      setSelectedSnapshotIndex(0);
      setRuntimeTick(0);
      let runtime: Runtime;
      try {
        runtime = new Runtime(sprites, () => runtime.render());
        runtimeRef.current = runtime;
        runtime.setErrorHandler((message) => setRuntimeError(message));
        runtime.start();
      } catch (error) {
        // Always leave the Run button usable after a failed start.
        codeRunning.current = false;
        runtimeActiveRef.current = false;
        setCodeRunningState(false);
        setRuntimeError(error instanceof Error ? error.message : String(error));
        return;
      }
      setCodeRunningState(true);
      runtimeActiveRef.current = true;
      codeRunning.current = true;
      recordRuntimeSnapshot(runtime, performance.now());
      const isTyping = (target: EventTarget | null) =>
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const keyDownEvent = (event: KeyboardEvent) => {
        if (isTyping(event.target)) return;
        // Keep arrow keys and space from scrolling the page while playing.
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
            event.key,
          )
        ) {
          event.preventDefault();
        }
        // Holding a key down must not start the script again and again.
        if (event.repeat) return;
        runtime.keyPressed(event.key);
      };
      const keyUpEvent = (event: KeyboardEvent) => {
        runtime.keyReleased(event.key);
      };
      const mouseDownEvent = () => {
        runtime._mouseDown = true;
      };
      const mouseUpEvent = () => {
        runtime._mouseDown = false;
      };
      const canvasClickEvent = function (event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
        runtime.screenClick(x, y);
      };
      const canvasMouseMoveEvent = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        runtime.setMousePosition(
          ((event.clientX - rect.left) / rect.width) * canvas.width,
          ((event.clientY - rect.top) / rect.height) * canvas.height,
        );
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      };
      canvas.addEventListener("click", canvasClickEvent);
      window.addEventListener("keydown", keyDownEvent);
      window.addEventListener("keyup", keyUpEvent);
      canvas.addEventListener("mousemove", canvasMouseMoveEvent);
      window.addEventListener("mousedown", mouseDownEvent);
      window.addEventListener("mouseup", mouseUpEvent);
      const cleanup = () => {
        window.removeEventListener("keydown", keyDownEvent);
        window.removeEventListener("keyup", keyUpEvent);
        window.removeEventListener("mousedown", mouseDownEvent);
        window.removeEventListener("mouseup", mouseUpEvent);
        canvas.removeEventListener("mousemove", canvasMouseMoveEvent);
        canvas.removeEventListener("click", canvasClickEvent);
      };
      runCleanupRef.current = cleanup;
      let prev = performance.now();
      function step() {
        // a newer run or a stop replaced this loop
        if (runIdRef.current !== myRunId) return;
        const now = performance.now();
        const deltaTime = (now - prev) / 1000;
        prev = now;
        let errorCheck = false;
        try {
          runtime.tick(deltaTime, now);
          recordRuntimeSnapshot(runtime, now);
          if (
            runtime._scripts.filter((r) => r.trigger.type !== "start")
              .length === 0 &&
            (runtime._threads.length === 0 ||
              !runtime._threads.some((thread) => thread.status !== "done"))
          ) {
            setCodeRunningState(false);
            runtimeActiveRef.current = false;
            // auto stop when there are no scripts that rely on events within the program and all threads have finished
          }
        } catch (error) {
          setCodeRunningState(false);
          errorCheck = true;
          codeRunning.current = false;
          cleanup();
          const runtimeErrorMessage =
            runtime._lastError ||
            (error instanceof Error ? error.message : String(error));
          setRuntimeError(runtimeErrorMessage);
          if (!(error instanceof TypeError)) {
            console.error("Error during runtime tick:", error);
          }
        }
        if (!errorCheck && codeRunning.current) {
          requestAnimationFrame(step);
        } else {
          setCodeRunningState(false);
          cleanup();
          if (runCleanupRef.current === cleanup) runCleanupRef.current = null;
          publishSnapshotState();
          for (const target of runtime._targets) {
            target.clearBubbles();
          }
          runtime._renderer.blit(runtime._targets);
        }
      }
      requestAnimationFrame(step);
    } finally {
      Blockly.Events.enable();
    }
  };

  const stopCode = () => {
    codeRunning.current = false;
    runtimeActiveRef.current = false;
    runIdRef.current += 1;
    runCleanupRef.current?.();
    runCleanupRef.current = null;
    const runtime = runtimeRef.current;
    runtime?.clearError();
    setRuntimeError(null);
    runtime?.stopAll();
    if (runtime) {
      for (const target of runtime._targets) {
        target.clearBubbles();
      }
      runtime._renderer.blit(runtime._targets);
    }
    setCodeRunningState(false);
    publishSnapshotState();
  };

  function runFromCodeTab() {
    setActiveTab("screen");
    window.setTimeout(() => runCode(), 100);
  }

  function saveCurrentWorkspaceToDatabase() {
    if (!Blockly.getMainWorkspace()) {
      return;
    }
    let realId =
      activeSpriteRef.current && "isBackdrop" in activeSpriteRef.current
        ? -activeSpriteRef.current.id
        : activeSpriteRef.current?.id; // we do this to get back to the actual id of the backdrop in the database (negative numbers just work well here)
    console.warn("Saving workspace for sprite with id:", realId);
    const currentActiveSprite = activeSpriteRef.current;
    if (!currentActiveSprite) {
      return;
    }
    const topBlocks = Blockly.getMainWorkspace().getTopBlocks(false);
    // console.log("Top blocks:", topBlocks);
    let fullJson = [];
    for (const block of topBlocks) {
      const blockJson = Blockly.serialization.blocks.save(block);
      fullJson.push(blockJson);
    }
    (async () => {
      const savedVariables = activeSpriteRef.current?.variables_map;
      await new DatabaseManager().updateSpriteBlocksAndVariables(
        realId as number,
        fullJson,
        savedVariables,
        "isBackdrop" in currentActiveSprite &&
          (currentActiveSprite.isBackdrop as boolean),
      );
      if (!("isBackdrop" in currentActiveSprite)) {
        //@ts-ignore
        setSprites((prevSprites) =>
          prevSprites.map((sprite: DatabaseSprite) =>
            sprite.id === currentActiveSprite.id
              ? {
                  ...sprite,
                  blocks_json: fullJson,
                  variables_map: savedVariables,
                }
              : sprite,
          ),
        );
      } else {
        //@ts-ignore
        setSprites((prevSprites: (DatabaseSprite | DatabaseBackdrop)[]) =>
          prevSprites.map((sprite: DatabaseSprite | DatabaseBackdrop) =>
            sprite.id === -currentActiveSprite.id && "isBackdrop" in sprite
              ? {
                  ...sprite,
                  blocks_json: fullJson,
                  variables_map: savedVariables,
                }
              : sprite,
          ),
        );
      }
      const projects = await new DatabaseManager().getProjects();
      await new DatabaseManager().updateProjectBroadcastMessages(
        projectId ? projectId : projects[0].id,
        broadcastMessagesRef.current,
      );
    })();
  }
  function renderBasePositions() {
    if (sprites.length === 0) return;
    const runtime = new Runtime(sprites, () => {
      runtime.render();
      saveThumbnail();
    });
  }

  async function setupWorkspace() {
    console.log("Setting up workspace...");
    Blockly.utils.colour.setHsvSaturation(0.89);
    Blockly.utils.colour.setHsvValue(0.85);
    if (!Blockly.getMainWorkspace()) {
      Blockly.common.defineBlocks(blocks);
      loops.loopTypes.add("controls_forever"); //register it as a loop block so break/continue doesnt look grayed out
    }
    try {
      registerExtensions("costume_dropdown_extension", function () {
        //@ts-ignore
        this.getField("COSTUME").setOptions(function () {
          const options = [];

          if (
            activeSpriteRef.current &&
            activeSpriteRef.current?.image_paths &&
            activeSpriteRef.current?.image_paths.length > 0 &&
            codeRunning.current === false
          ) {
            activeSpriteRef.current?.image_paths.forEach((costume) => {
              options.push([costume.costumeName, costume.loadablePath]);
            });
          } else if (codeRunning.current === true) {
            // all costumes are shown
            for (const sprite of spritesRef.current) {
              if (sprite.image_paths && sprite.image_paths.length > 0) {
                sprite.image_paths.forEach((costume) => {
                  options.push([costume.costumeName, costume.loadablePath]);
                });
              }
            }
          } else {
            options.push(["none", "NONE"]);
          }

          return options;
        });
      });
      registerExtensions("broadcast_dropdown_extension", function () {
        const field = this.getField("BROADCAST");

        if (!field) {
          return;
        }
        function optionsFn() {
          const toSet = broadcastMessagesRef.current;
          // console.log(`Setting broadcast options with:`, toSet);
          const options = [];
          for (const broadcastOption in toSet) {
            options.push(toSet[broadcastOption]);
          }
          if (options.length === 0) {
            console.warn("adding default message");
            options.push(["message 1", "message 1"]);
          }
          if (broadcastMessagesRef.current !== options) {
            broadcastMessagesRef.current = options.filter(
              (option) =>
                option[0] !== "New Message..." &&
                option[0] !== "Rename message...",
            ) as [string, string][];
          }
          // console.log(options as [string, string][]);
          options.push(["Rename message...", "RENAME_MESSAGE"]);
          options.push(["New Message...", "NEW_MESSAGE"]);
          return options;
        }
        //@ts-ignore
        field.setOptions(optionsFn);
        field.setValidator((newValue) => {
          if (newValue === "NEW_MESSAGE") {
            let i = 1;
            let defaultName = "message 1";
            do {
              defaultName = `message ${i}`;
              i++;
              //@ts-ignore
            } while (
              field
                //@ts-ignore
                .getOptions()
                .some(
                  ([text, value]: [string, string]) =>
                    text === defaultName && value === defaultName,
                )
            );
            console.log(defaultName);
            const promptEvent = new CustomEvent("broadcast-prompt", {
              detail: {
                message: "Create new broadcast",
                defaultValue: defaultName,
                callback: (name: string | null) => {
                  if (!name) {
                    return;
                  }
                  broadcastMessagesRef.current = [
                    ...broadcastMessagesRef.current,
                    [name, name],
                  ];
                  //@ts-ignore
                  field.setOptions(optionsFn);
                  field.setValue(name);
                },
              },
            });
            window.dispatchEvent(promptEvent);
            return null;
          } else if (newValue === "RENAME_MESSAGE") {
            const promptEvent = new CustomEvent("broadcast-prompt", {
              detail: {
                message: "Rename broadcast",
                defaultValue: field.getValue(),
                callback: (name: string | null) => {
                  if (!name) {
                    return;
                  }
                  const oldName = field.getValue();

                  broadcastMessagesRef.current =
                    broadcastMessagesRef.current.map(([text, value]) =>
                      value === oldName ? [name, name] : [text, value],
                    );
                  //@ts-ignore
                  field.setOptions(optionsFn);
                  field.setValue(name);
                },
              },
            });
            window.dispatchEvent(promptEvent);
            return null;
          }
          return newValue;
        });
      });
      registerExtensions("touching_dropdown_extension", function () {
        //@ts-ignore
        this.getField("TOUCHING").setOptions(function () {
          const options = [
            ["mouse-pointer", "MOUSE_POINTER"],
            ["edge", "EDGE"],
          ];
          for (const sprite of spritesRef.current) {
            if ("isBackdrop" in sprite && sprite.isBackdrop) {
              continue;
            }
            if (
              sprite.id === activeSpriteRef.current?.id &&
              !codeRunning.current
            ) {
              // we check coderunning because any touching block under any sprite may need the last activated sprite on the screen as a target
              // if we continue and dont add it to the list, there is a runtime error becuase blockly will reset the field
              continue;
            }
            options.push([sprite.name, sprite.id.toString()]);
          }
          return options;
        });
      });
      registerExtensions("glide_preset_dropdown_extension", function () {
        //@ts-ignore
        this.getField("GLIDE_PRESET").setOptions(function () {
          const options = [
            ["mouse-pointer", "MOUSE_POINTER"],
            ["random position", "RANDOM_POSITION"],
          ];
          for (const sprite of spritesRef.current) {
            if (
              sprite.id === activeSpriteRef.current?.id &&
              !codeRunning.current
            ) {
              // we check coderunning because any glide block under any sprite may need the last activated sprite on the screen as a target
              // if we continue and dont add it to the list, there is a runtime error becuase blockly will reset the field
              continue;
            }
            options.push([sprite.name, sprite.id.toString()]);
          }
          return options;
        });
      });
      registerExtensions("distance_to_dropdown_extension", function () {
        //@ts-ignore
        this.getField("DISTANCE_TO").setOptions(function () {
          const options = [["mouse-pointer", "MOUSE_POINTER"]];
          for (const sprite of spritesRef.current) {
            if (
              sprite.id === activeSpriteRef.current?.id &&
              !codeRunning.current
            ) {
              // we check coderunning because any distance block under any sprite may need the last activated sprite on the screen as a target
              // if we continue and dont add it to the list, there is a runtime error becuase blockly will reset the field
              continue;
            }
            options.push([sprite.name, sprite.id.toString()]);
          }
          return options;
        });
      });
    } catch (error) {
      // console.error("Error registering Blockly extensions:", error);
    }

    // Set up UI elements and inject Blockly
    const blocklyDiv = document.getElementById("blocklyDiv");
    if (blocklyDiv?.innerHTML !== "") {
      return;
    }

    if (!blocklyDiv) {
      throw new Error(`div with id 'blocklyDiv' not found`);
    }
    registerContinuousToolbox();
    const filteredToolbox = {
      ...toolbox,
      contents: toolbox.contents.filter((item) => {
        if (item.kind === "category" && item.name === "Functions") {
          return false;
        }
        return true;
      }),
    };
    let ws = Blockly.inject(blocklyDiv, {
      toolbox: filteredToolbox,
      plugins: {
        flyoutsVerticalToolbox: "CustomContinuousFlyout",
        metricsManager: "ContinuousMetrics",
        toolbox: "ContinuousToolbox",
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.7,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
        pinch: true,
      },
      theme: getBlocklyTheme(pastelTheme, accessibilitySettings),
      renderer: "zelos",
    });
    blocklyDiv.classList.toggle("codely-pastel", pastelTheme);
    document.body.classList.toggle("codely-pastel", pastelTheme);
    watchPastelTextContrast(blocklyDiv, pastelTheme);
    setWorkspace(ws);
    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      // UI events are things like scrolling, zooming, etc.
      // No need to save after one of these.
      if (e.type === Blockly.Events.VAR_DELETE) {
        const variableId = (e as Blockly.Events.VarDelete).varId;
        if (!variableId) return;
        console.log("Deleting variable:", variableId);

        const updatedSprites = spritesRef.current.map((sprite) => ({
          ...sprite,
          variables_map: sprite.variables_map.filter(
            (variable) => variable.id !== variableId,
          ),
        }));
        spritesRef.current = updatedSprites;
        setSprites(updatedSprites);
        const currentActiveSprite = activeSpriteRef.current;
        if (currentActiveSprite) {
          activeSpriteRef.current =
            updatedSprites.find(
              (sprite) =>
                sprite.id === currentActiveSprite.id &&
                "isBackdrop" in sprite === "isBackdrop" in currentActiveSprite,
            ) || currentActiveSprite;
        }

        void (async () => {
          try {
            await new DatabaseManager().deleteVariableFromProject(
              activeSpriteRef.current!.project_id,
              variableId,
            );

            await importDatabaseData();
          } catch (error) {
            console.error("Error deleting variable:", error);
          }
        })();
      }
      if (e.isUiEvent) return;
      saveCurrentWorkspaceToDatabase();
    });
    ws.registerToolboxCategoryCallback("PROCEDURE_NORETURNS", (workspace) => {
      return Blockly.Procedures.flyoutCategory(workspace).filter((item) => {
        //@ts-expect-error
        let type = item.type;

        return (
          type !== "procedures_callreturn" &&
          type !== "procedures_defreturn" &&
          type !== "procedures_ifreturn"
        );
      });
    });
    ws.updateToolbox(toolbox);
    Blockly.svgResize(ws);
    ws.addChangeListener(shadowBlockConversionChangeListener);
    Blockly.dialog.setPrompt(
      (
        message: string,
        defaultValue: string,
        originalCallback: (value: string | null) => void,
      ) => {
        function createNewVariable(name: string | null, isGlobal: boolean) {
          if (!name) {
            return;
          }
          if (!Blockly.getMainWorkspace()) {
            return;
          }
          Blockly.Events.disable();
          {
            (async () => {
              try {
                const variable = Blockly.getMainWorkspace()
                  .getVariableMap()
                  .createVariable(name, undefined);
                (
                  Blockly.getMainWorkspace() as Blockly.WorkspaceSvg
                ).refreshToolboxSelection();
                await new DatabaseManager().addVariableToSprite(
                  "isBackdrop" in activeSpriteRef.current!
                    ? -activeSpriteRef.current!.id
                    : activeSpriteRef.current!.id,
                  variable.getId(),
                  variable.getName(),
                  isGlobal,
                  "isBackdrop" in activeSpriteRef.current! &&
                    (activeSpriteRef.current!.isBackdrop as boolean),
                );
                await importDatabaseData();
              } finally {
                Blockly.Events.enable();
              }
            })();
          }
        }
        async function renameVariable(newName: string) {
          console.log("Renaming variable to:", newName);
          const variablesInWorkspace = Blockly.getMainWorkspace()
            ?.getVariableMap()
            ?.getAllVariables();
          if (!activeSpriteRef.current) {
            return;
          }

          originalCallback(newName);
          const variable = variablesInWorkspace?.find(
            (v) => v.getName() === newName,
          );
          if (!variable) {
            return; // really shouldnt happen, but just in case
          }
          console.log("Variables in workspace:", variablesInWorkspace);
          console.log("Renaming variable:", "to new name:", newName);
          const activeSprite = activeSpriteRef.current;
          const renamedSprites = spritesRef.current.map((sprite) => ({
            ...sprite,
            variables_map: sprite.variables_map.map((storedVariable) =>
              storedVariable.id === variable.getId()
                ? { ...storedVariable, name: newName }
                : storedVariable,
            ),
          }));
          spritesRef.current = renamedSprites;
          setSprites(renamedSprites);
          activeSpriteRef.current =
            renamedSprites.find(
              (sprite) =>
                sprite.id === activeSprite.id &&
                "isBackdrop" in sprite === "isBackdrop" in activeSprite,
            ) || activeSprite;

          await new DatabaseManager().renameVariableInProject(
            activeSprite.project_id,
            variable.getId(),
            newName,
          );
          saveCurrentWorkspaceToDatabase();
        }

        if (message === "New variable name:") {
          const promptEvent = new CustomEvent("blockly-prompt", {
            detail: {
              message: message,
              defaultValue: defaultValue,
              callback: createNewVariable,
            },
          });
          window.dispatchEvent(promptEvent);
        } else if (message.startsWith("Rename all")) {
          const promptEvent = new CustomEvent("blockly-prompt", {
            detail: {
              message: message,
              defaultValue: defaultValue,
              callback: renameVariable,
            },
          });
          window.dispatchEvent(promptEvent);
        } else {
          console.log("Prompt message:", message);
          return undefined;
        }
      },
    );
    Blockly.dialog.setConfirm(
      (message: string, callback: (result: boolean) => void) => {
        const promptEvent = new CustomEvent("blockly-prompt", {
          detail: {
            message: message,
            callback: callback,
          },
        });
        window.dispatchEvent(promptEvent);
      },
    );
  }

  function unregisterCustomBlockExtensions() {
    const mainWorkspace = Blockly.getMainWorkspace();
    if (mainWorkspace) {
      mainWorkspace.dispose();
      setWorkspace(null);
    }

    unregisterExtensions();
  }

  return (
    <main className="p-2 bg-slate-50 dark:bg-slate-800 min-h-dvh h-dvh max-h-dvh text-slate-900">
      {void runtimeTick}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          // Leaving the Screen tab ends the run so it cannot draw to a missing canvas.
          if (value !== "screen" && codeRunning.current) {
            stopCode();
          }
          setActiveTab(value);
          async function change() {
            if (value === "blocks") {
              await importDatabaseData();
              await setupWorkspace();
              setTimeout(() => {
                const workspace = Blockly.getMainWorkspace();
                Blockly.svgResize(workspace as Blockly.WorkspaceSvg);
              }, 100);
            } else if (value === "screen") {
              setTimeout(() => {
                renderBasePositions();
              }, 100);
            } else {
              saveCurrentWorkspaceToDatabase();
            }
          }
          change();
        }}
        className="w-full h-full"
      >
        <TabsList>
          <TabsTrigger value="blocks">Code</TabsTrigger>
          <TabsTrigger value="costumes">
            {(activeSprite?.id || 1) < 0 ? "Backdrops" : "Costumes"}
          </TabsTrigger>
          <TabsTrigger value="screen">Screen</TabsTrigger>
        </TabsList>
        <TabsContent
          value="blocks"
          keepMounted
          className="w-full h-full max-w-dvw"
        >
          <div
            id="pageContainer"
            className="flex w-full h-full max-w-dvw gap-2"
          >
            <div className="relative flex-5">
              <div className="h-full w-full" id="blocklyDiv"></div>
              <BlocklyHelp workspace={workspace} />
              <Button
                size="sm"
                onClick={runFromCodeTab}
                disabled={codeRunningState === true || !workspace}
                className="absolute right-3 top-3 z-10 shadow-sm"
              >
                <Play />
                Run Code
              </Button>
            </div>
            <SpriteAndBackdropSelector
              sprites={sprites}
              activeSprite={activeSprite}
              setActiveSprite={setActiveSprite}
              activeSpriteRef={activeSpriteRef}
              spriteDialogOpen={spriteDialogOpen}
              setSpriteDialogOpen={setSpriteDialogOpen}
              spriteNameDialogValue={spriteNameDialogValue}
              setSpriteNameDialogValue={setSpriteNameDialogValue}
              spriteImageDialogValue={spriteImageDialogValue}
              setSpriteImageDialogValue={setSpriteImageDialogValue}
              appDataDirRef={_appDataDir}
              projectId={projectId}
              importDatabaseData={importDatabaseData}
            />
          </div>
        </TabsContent>
        <TabsContent value="costumes" className="w-full h-full max-w-dvw">
          <div
            id="pageContainer"
            className="flex w-full h-full max-w-dvw gap-2"
          >
            <div className="flex-5 gap-1 flex flex-row">
              <CostumeEditor
                //@ts-ignore
                activeSprite={activeSprite}
                appDataDir={_appDataDir.current || ""}
                refreshDataCallback={importDatabaseData}
                projectId={projectId || 0}
              />
            </div>
            <SpriteAndBackdropSelector
              sprites={sprites}
              activeSprite={activeSprite}
              setActiveSprite={setActiveSprite}
              activeSpriteRef={activeSpriteRef}
              spriteDialogOpen={spriteDialogOpen}
              setSpriteDialogOpen={setSpriteDialogOpen}
              spriteNameDialogValue={spriteNameDialogValue}
              setSpriteNameDialogValue={setSpriteNameDialogValue}
              spriteImageDialogValue={spriteImageDialogValue}
              setSpriteImageDialogValue={setSpriteImageDialogValue}
              appDataDirRef={_appDataDir}
              projectId={projectId}
              importDatabaseData={importDatabaseData}
            />
          </div>
        </TabsContent>
        <TabsContent value="screen" className="w-full h-full max-w-dvw">
          <div
            id="pageContainer"
            className="flex w-full h-full max-w-dvw gap-2"
          >
            <Card
              id="outputPane"
              className="m-2 flex min-h-0 w-full min-w-2/5 flex-col justify-between overflow-hidden"
            >
              <CardContent className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-auto p-3">
                <div className="relative aspect-4/3 w-full max-w-200 shrink-0">
                  <canvas
                    className="absolute inset-0 h-full w-full rounded-lg border border-slate-300"
                    id="backgroundCanvas"
                    width="800"
                    height="600"
                  ></canvas>
                  <canvas
                    className="absolute inset-0 h-full w-full rounded-lg border border-slate-300"
                    id="foregroundCanvas"
                    width="800"
                    height="600"
                  ></canvas>
                </div>
                <div className="mt-2 grid w-full max-w-200 gap-2 rounded-lg border bg-white p-2 text-sm shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
                  <div className="min-w-0 space-y-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
                      <Label
                        id="runtime-rewind-label"
                        className="shrink-0 font-medium"
                      >
                        Timeline
                      </Label>
                      <Slider
                        min={0}
                        max={Math.max(0, snapshotCount - 1)}
                        step={1}
                        value={Math.min(
                          selectedSnapshotIndex,
                          Math.max(0, snapshotCount - 1),
                        )}
                        onValueChange={(next) => {
                          if (runtimeActiveRef.current) {
                            return;
                          }
                          const index = Array.isArray(next) ? next[0] : next;
                          setSelectedSnapshotIndex(index);
                          restoreRuntimeSnapshot(index);
                        }}
                        disabled={snapshotCount < 2}
                        aria-labelledby="runtime-rewind-label"
                        className="min-w-0 flex-1"
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {snapshotCount} frames
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-none">Variables</h3>
                    <div className="mt-1 grid max-h-20 gap-1 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-1">
                      {(runtimeRef.current?._targets ?? []).map((target) => (
                        <div
                          key={target.id}
                          className="rounded border bg-blue-50 border-blue-100 text-blue-950 px-2 py-1"
                        >
                          <div className="font-medium">
                            {target.isBackdrop
                              ? "Backdrop"
                              : `Sprite ${target.id}`}
                          </div>
                          {Array.from(target.variables.entries()).length ===
                          0 ? (
                            <div className="text-blue-400">No variables</div>
                          ) : (
                            Array.from(target.variables.entries()).map(
                              ([id, value]) => (
                                <div
                                  key={id}
                                  className="flex justify-between gap-3"
                                >
                                  <span>
                                    {spritesRef.current
                                      .flatMap((sprite) => sprite.variables_map)
                                      .find((variable) => variable.id === id)
                                      ?.name ?? id}
                                  </span>
                                  <span>{String(value)}</span>
                                </div>
                              ),
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-1 items-center">
                <Button
                  onClick={() => {
                    runCode();
                  }}
                  disabled={codeRunningState === true}
                >
                  <Play />
                  Run Code
                </Button>
                <Button
                  onClick={() => {
                    stopCode();
                  }}
                  disabled={codeRunningState === false}
                >
                  <Square />
                  Stop Code
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Button
        variant="secondary"
        onClick={() => {
          stopCode();
          unregisterCustomBlockExtensions();
          cb();
        }}
        className="absolute top-2 right-2"
      >
        <Undo2 />
        Back to Menu
      </Button>
      <BlocklyVariablePromptDialog />
      <BroadcastPromptDialog />
      <RuntimeErrorDialog
        open={runtimeError !== null}
        message={runtimeError}
        onClose={() => setRuntimeError(null)}
      />
    </main>
  );
}

export default CodeEditor;
