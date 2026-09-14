import "./App.css";
import * as React from "react";
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
import { appDataDir } from "@tauri-apps/api/path";
import { DatabaseBackdrop, DatabaseSprite } from "@/types/database";
import { Runtime } from "@/runner/runtime";
import { DatabaseManager } from "./lib/database";
import CostumeEditor from "./components/CostumeEditor";
import BroadcastPromptDialog from "./components/BroadcastPromptDialog";
import SpriteAndBackdropSelector from "./components/SpriteBackdropSelector";
import { Undo2 } from "lucide-react";
import { BlocklyHelp } from "./components/BlocklyHelp";
import theme from "./blocks/theme";

function CodeEditor({
  projectId,
  cb,
}: {
  projectId: number | null;
  cb: () => void;
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
  const [codeRunningState, setCodeRunningState] = React.useState(false);
  const broadcastMessagesRef = useRef<[string, string][]>([]);
  const spritesRef = useRef(sprites);

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
      _appDataDir.current = await appDataDir();
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
      await new DatabaseManager().getProjectBroadcastMessages(projects[0].id);
    broadcastMessagesRef.current = broadcastMessages as [string, string][];
  }

  const runCode = () => {
    if (!Blockly.getMainWorkspace()) return;
    Blockly.Events.disable();
    try {
      setCodeRunningState(true);
      codeRunning.current = true;
      const runtime = new Runtime(sprites, () => runtime.render());
      runtime.start();
      const canvas = document.getElementById(
        "foregroundCanvas",
      ) as HTMLCanvasElement;
      if (canvas === null) {
        console.error("what");
        return;
      }
      const keyDownEvent = (event: KeyboardEvent) => {
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
      let prev = performance.now();
      function step() {
        const now = performance.now();
        const deltaTime = (now - prev) / 1000; // Convert to seconds
        prev = now;
        let errorCheck = false;
        try {
          runtime.tick(deltaTime, now);
          if (
            runtime._scripts.filter((r) => r.trigger.type !== "start")
              .length === 0 &&
            (runtime._threads.length === 0 ||
              !runtime._threads.some((thread) => thread.status !== "done"))
          ) {
            setCodeRunningState(false);
            // auto stop when there are no scripts that rely on events within the program and all threads have finished
          }
        } catch (error) {
          setCodeRunningState(false);
          errorCheck = true;
          window.removeEventListener("keydown", keyDownEvent);
          window.removeEventListener("keyup", keyUpEvent);
          window.removeEventListener("mousedown", mouseDownEvent);
          window.removeEventListener("mouseup", mouseUpEvent);
          window.removeEventListener("mousemove", canvasMouseMoveEvent);
          canvas.removeEventListener("click", canvasClickEvent);
          if (!(error instanceof TypeError)) {
            console.error("Error during runtime tick:", error);
          }
        }
        if (!errorCheck && codeRunning.current) {
          requestAnimationFrame(step);
        } else {
          setCodeRunningState(false);
          console.warn("Code stopped, removing event listeners");
          window.removeEventListener("keydown", keyDownEvent);
          window.removeEventListener("keyup", keyUpEvent);
          window.removeEventListener("mousedown", mouseDownEvent);
          window.removeEventListener("mouseup", mouseUpEvent);
          window.removeEventListener("mousemove", canvasMouseMoveEvent);
          canvas.removeEventListener("click", canvasClickEvent);
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
  };

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
      await new DatabaseManager().updateProjectBroadcastMessages(
        1,
        broadcastMessagesRef.current,
      );
    })();
  }
  function renderBasePositions() {
    if (sprites.length === 0) return;
    const runtime = new Runtime(sprites, () => runtime.render());
    runtime.render();
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
      Blockly.Extensions.register("costume_dropdown_extension", function () {
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
      Blockly.Extensions.register("broadcast_dropdown_extension", function () {
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
      Blockly.Extensions.register("touching_dropdown_extension", function () {
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
      Blockly.Extensions.register(
        "glide_preset_dropdown_extension",
        function () {
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
        },
      );
      Blockly.Extensions.register(
        "distance_to_dropdown_extension",
        function () {
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
        },
      );
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
      theme: theme,
      renderer: "zelos",
    });
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

    for (const extensionName of [
      "costume_dropdown_extension",
      "broadcast_dropdown_extension",
      "touching_dropdown_extension",
      "glide_preset_dropdown_extension",
      "distance_to_dropdown_extension",
    ]) {
      Blockly.Extensions.unregister(extensionName);
    }
  }

  return (
    <main className="p-2 bg-slate-50 dark:bg-slate-800 min-h-dvh h-dvh max-h-dvh text-slate-900">
      <Tabs
        defaultValue="blocks"
        onValueChange={(value) => {
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
              className="flex flex-col justify-between min-w-2/5 w-full overflow-auto m-4"
            >
              <CardContent className="relative flex w-full flex-col justify-center items-center">
                <canvas
                  className="border border-slate-300 rounded-lg"
                  id="backgroundCanvas"
                  width="800"
                  height="600"
                ></canvas>
                <canvas
                  className="absolute border border-slate-300 rounded-lg"
                  id="foregroundCanvas"
                  width="800"
                  height="600"
                ></canvas>
              </CardContent>
              <CardFooter className="flex justify-center gap-1 items-center">
                <Button
                  onClick={() => {
                    runCode();
                  }}
                  disabled={codeRunningState === true}
                >
                  Run Code
                </Button>
                <Button
                  onClick={() => {
                    stopCode();
                  }}
                  disabled={codeRunningState === false}
                >
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
    </main>
  );
}

export default CodeEditor;
