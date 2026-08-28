import "./App.css";
import * as React from "react";
import * as Blockly from "blockly";
import { blocks } from "./blocks/blocks";
import { toolbox } from "./toolbox";
import { loops } from "blockly/blocks";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import SpriteSelector from "./components/SpriteBackdropSelector";

function App() {
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
  const [backdropDialogOpen, setbackdropDialogOpen] = React.useState(false);
  const [backdropImageDialogValue, setbackdropImageDialogValue] =
    React.useState<string | null>(null);
  const [backdropNameDialogValue, setbackdropNameDialogValue] = React.useState<
    string | null
  >(null);
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
    const projects = await new DatabaseManager().getProject();
    let spritesResult = await new DatabaseManager().getSpritesForProject(
      projects[0].id,
    );
    let backdropsResult = await new DatabaseManager().getBackdropsForProject(
      projects[0].id,
    );
    console.log(backdropsResult);
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
            (backdrop) => backdrop.id === prevActiveSprite.id,
          );
          return updatedBackdrop || null;
        }
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
      const runtime = new Runtime(sprites);
      runtime.start();
      const canvas = document.getElementById("foregroundCanvas");
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
      const mouseDownEvent = (event: MouseEvent) => {
        runtime._mouseDown = true;
      };
      const mouseUpEvent = (event: MouseEvent) => {
        runtime._mouseDown = false;
      };
      const canvasClickEvent = function (event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        runtime.screenClick(x, y);
      };
      const canvasMouseMoveEvent = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        runtime.setMousePosition(
          event.clientX - rect.left,
          event.clientY - rect.top,
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
          //@ts-expect-error
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
          for (const target of runtime._targets) {
            target.clearBubbles();
          }
          runtime._renderer.blit(runtime._targets);
          window.removeEventListener("mousedown", mouseDownEvent);
          window.removeEventListener("mouseup", mouseUpEvent);
          window.removeEventListener("mousemove", canvasMouseMoveEvent);
          //@ts-expect-error
          canvas.removeEventListener("click", canvasClickEvent);
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
            sprite.id === currentActiveSprite.id && "isBackdrop" in sprite
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
  function refreshAllBroadcastFields() {
    const workspace = Blockly.getMainWorkspace();

    if (!workspace) {
      return;
    }

    const options: [string, string][] = [...broadcastMessagesRef.current];

    if (options.length === 0) {
      options.push(["message 1", "message 1"]);
    }

    options.push(["Rename message...", "RENAME_MESSAGE"]);
    options.push(["New Message...", "NEW_MESSAGE"]);

    for (const block of workspace.getAllBlocks(false)) {
      const field = block.getField("BROADCAST");

      if (!field) {
        continue;
      }

      const currentValue = field.getValue();

      // @ts-ignore
      field.setOptions(options);

      if (
        broadcastMessagesRef.current.some(([, value]) => value === currentValue)
      ) {
        field.setValue(currentValue);
      }
    }
    //@ts-ignore
    const flyout = workspace.getFlyout();

    if (flyout) {
      for (const item of flyout.getContents()) {
        if (item.type !== "block") {
          continue;
        }

        const block = item.element as Blockly.Block;
        const field = block.getField("BROADCAST");
        if (!field) {
          continue;
        }

        const currentValue = field.getValue();

        // @ts-ignore
        field.setOptions(options);

        if (
          broadcastMessagesRef.current.some(
            ([, value]) => value === currentValue,
          )
        ) {
          field.setValue(currentValue);
        }
      }
    }

    flyout?.reflow();
  }

  async function setupWorkspace() {
    console.log("Setting up workspace...");
    Blockly.utils.colour.setHsvSaturation(0.89);
    Blockly.utils.colour.setHsvValue(0.85);
    if (!Blockly.getMainWorkspace()) {
      Blockly.common.defineBlocks(blocks);
      loops.loopTypes.add("controls_forever"); //register it as a loop block so break/continue doesnt look grayed out
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
        function optionsFn(toSet: [string, string][]) {
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
        field.setOptions(optionsFn(broadcastMessagesRef.current));
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
                  //@ts-ignoer
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

                  refreshAllBroadcastFields();

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

                  refreshAllBroadcastFields();

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
    }
    const theme = Blockly.Theme.defineTheme("cac", {
      name: "cac",
      base: Blockly.Themes.Classic,
      componentStyles: {
        toolboxBackgroundColour: "#f5f5f5",
        flyoutBackgroundColour: "#f5f5f5",
      },
      categoryStyles: {
        screen_category: {
          colour: "310",
        },
        event_category: {
          colour: "44",
        },
        loop_category: {
          colour: "113",
        },
      },
      startHats: true,
    });

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

        void (async () => {
          try {
            await new DatabaseManager().deleteVariableFromSprite(
              activeSpriteRef.current!.id,
              variableId,
              "isBackdrop" in activeSpriteRef.current! &&
                (activeSpriteRef.current!.isBackdrop as boolean),
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
                  activeSpriteRef.current!.id,
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
              callback: originalCallback,
            },
          });
          window.dispatchEvent(promptEvent);
        } else {
          console.log("Prompt message:", message);
          return undefined;
        }
      },
    );
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
          <TabsTrigger value="costumes">Costumes</TabsTrigger>
          <TabsTrigger value="screen">Screen</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks" className="w-full h-full max-w-dvw">
          <div
            id="pageContainer"
            className="flex w-full h-full max-w-dvw gap-2"
          >
            <div className="flex-5" id="blocklyDiv"></div>
            <SpriteSelector
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
              backdropDialogOpen={backdropDialogOpen}
              setbackdropDialogOpen={setbackdropDialogOpen}
              backdropNameDialogValue={backdropNameDialogValue}
              setbackdropNameDialogValue={setbackdropNameDialogValue}
              backdropImageDialogValue={backdropImageDialogValue}
              setbackdropImageDialogValue={setbackdropImageDialogValue}
              appDataDirRef={_appDataDir}
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
                activeSprite={activeSprite}
                appDataDir={_appDataDir.current || ""}
                refreshDataCallback={importDatabaseData}
              />
            </div>
            <SpriteSelector
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
              backdropDialogOpen={backdropDialogOpen}
              setbackdropDialogOpen={setbackdropDialogOpen}
              backdropNameDialogValue={backdropNameDialogValue}
              setbackdropNameDialogValue={setbackdropNameDialogValue}
              backdropImageDialogValue={backdropImageDialogValue}
              setbackdropImageDialogValue={setbackdropImageDialogValue}
              appDataDirRef={_appDataDir}
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
              className="flex flex-col min-w-2/5 w-full overflow-auto m-4"
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
              <CardFooter className="flex justify-center">
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
      <BlocklyVariablePromptDialog />
      <BroadcastPromptDialog />
    </main>
  );
}

export default App;
