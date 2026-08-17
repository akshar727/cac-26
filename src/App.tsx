import "./App.css";
import * as React from "react";
import * as Blockly from "blockly";
import { blocks } from "./blocks/blocks";
import { openPath } from "@tauri-apps/plugin-opener";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toolbox } from "./toolbox";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { BlocklyVariablePromptDialog } from "./components/BlocklyVariablePromptDialog";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "./components/ui/button";
import { copyFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { useRef } from "react";
import { shadowBlockConversionChangeListener } from "@blockly/shadow-block-converter";
import { registerContinuousToolbox } from "@blockly/continuous-toolbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "./components/ui/skeleton";
import { appDataDir } from "@tauri-apps/api/path";
import { DatabaseSprite } from "@/types/databaseSprite";
import { Runtime } from "@/runner/runtime";
import { DatabaseManager } from "./lib/database";
import CostumeEditor from "./components/CostumeEditor";
import { cn } from "./lib/utils";
import BroadcastPromptDialog from "./components/BroadcastPromptDialog";

function App() {
  const activeSpriteRef = useRef<DatabaseSprite | null>(null);
  const [workspace, setWorkspace] = React.useState<Blockly.WorkspaceSvg | null>(
    null,
  );
  const [activeSprite, setActiveSprite] = React.useState<DatabaseSprite | null>(
    null,
  );
  const [sprites, setSprites] = React.useState<DatabaseSprite[]>([]);
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

  React.useEffect(() => {
    codeRunning.current = codeRunningState;
  }, [codeRunningState]);

  // change ref
  React.useEffect(() => {
    activeSpriteRef.current = activeSprite;
  }, [activeSprite]);

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
    let result = await new DatabaseManager().getSpritesForProject(1);
    setSprites(result);
    if (!activeSprite && result.length > 0) {
      setActiveSprite(result[0]);
      console.log("Active sprite set to:", result[0]);
      console.log("All sprites:", result);
    } else {
      setActiveSprite((prevActiveSprite) => {
        if (prevActiveSprite) {
          const updatedSprite = result.find(
            (sprite) => sprite.id === prevActiveSprite.id,
          );
          return updatedSprite || null;
        }
        return null;
      });
    }
    let broadcastMessages =
      await new DatabaseManager().getProjectBroadcastMessages(1);
    broadcastMessagesRef.current = broadcastMessages as [string, string][];
  }

  const runCode = () => {
    if (!Blockly.getMainWorkspace()) return;
    Blockly.Events.disable();
    try {
      const runtime = new Runtime(sprites);
      runtime.start();
      const canvas = document.getElementById("foregroundCanvas");
      if (canvas === null) {
        console.error("what");
        return;
      }
      setCodeRunningState(true);
      const keyDownEvent = (event: KeyboardEvent) => {
        runtime.keyPressed(event.key);
      };
      const canvasClickEvent = function (event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        runtime.screenClick(x, y);
      };
      canvas.addEventListener("click", canvasClickEvent);
      window.addEventListener("keydown", keyDownEvent);
      let prev = performance.now();
      function step() {
        const now = performance.now();
        const deltaTime = (now - prev) / 1000; // Convert to seconds
        prev = now;
        let error = false;
        try {
          runtime.tick(deltaTime, now);
        } catch (error) {
          console.warn("Error during runtime tick:", error);
          setCodeRunningState(false);
          error = true;
          window.removeEventListener("keydown", keyDownEvent);
          //@ts-expect-error
          canvas.removeEventListener("click", canvasClickEvent);
          if (!(error instanceof TypeError)) {
            console.error("Error during runtime tick:", error);
          }
        }
        if (!error && codeRunning.current) {
          requestAnimationFrame(step);
        } else {
          setCodeRunningState(false);
          console.warn("Code stopped, removing keydown event listener");
          window.removeEventListener("keydown", keyDownEvent);
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
        currentActiveSprite.id,
        fullJson,
        savedVariables,
      );
      //@ts-ignore
      setSprites((prevSprites) =>
        prevSprites.map((sprite) =>
          sprite.id === currentActiveSprite.id
            ? {
                ...sprite,
                blocks_json: fullJson,
                variables_map: savedVariables,
              }
            : sprite,
        ),
      );
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

  function SpriteSelector() {
    return (
      <Card className="flex-2 justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Sprites</CardTitle>
          {sprites.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sprites.map((sprite: DatabaseSprite) => {
                return (
                  <Card
                    className={cn(
                      "hover:cursor-pointer hover:bg-slate-100 transition-colors duration-200",
                      activeSprite?.id === sprite.id ? "bg-slate-100" : "",
                    )}
                    onClick={() => {
                      setActiveSprite(sprite);
                      activeSpriteRef.current = sprite;
                      // console.log("Active sprite set to:", sprite);
                      setTimeout(() => {
                        // console.log(activeSprite);
                      }, 0);
                    }}
                    key={sprite.id}
                  >
                    <CardContent className="flex flex-col items-center gap-2">
                      {sprite.image_paths.length === 0 ? (
                        <Skeleton className="w-16 h-16" />
                      ) : (
                        <img
                          src={sprite.image_paths[0].loadablePath}
                          alt={sprite.name}
                          style={{
                            maxWidth: 64,
                            maxHeight: 64,
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                          }}
                        />
                      )}
                      <p className={`text-sm text-center`}>{sprite.name}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p>Sprites will be displayed here.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Dialog
            open={spriteDialogOpen}
            onOpenChange={setSpriteDialogOpen}
            onOpenChangeComplete={() => {
              setSpriteImageDialogValue("");
              setSpriteNameDialogValue("");
            }}
          >
            <DialogTrigger
              render={<Button onClick={async () => {}}>Add a sprite</Button>}
            />
            <DialogContent>
              <DialogTitle>Add a new sprite</DialogTitle>
              <DialogDescription>
                Enter the name of the new sprite and select an image file.
              </DialogDescription>
              <FieldGroup>
                <Field>
                  <Label htmlFor="spriteName">Sprite Name</Label>
                  <Input
                    id="spriteName"
                    type="text"
                    value={spriteNameDialogValue || ""}
                    onChange={(e) => setSpriteNameDialogValue(e.target.value)}
                    placeholder="Enter sprite name"
                  />
                </Field>
                <Field>
                  <Label htmlFor="spriteImage">Sprite Images</Label>
                  <Button
                    onClick={async () => {
                      const selectedFile = await open({
                        multiple: true,
                        filters: [
                          {
                            name: "Images",
                            extensions: ["png", "jpg", "jpeg", "svg"],
                          },
                        ],
                      });
                      console.log("Selected file:", selectedFile);
                      if (selectedFile) {
                        if (typeof selectedFile === "string") {
                          setSpriteImageDialogValue("[" + selectedFile + "]");
                        } else if (Array.isArray(selectedFile)) {
                          setSpriteImageDialogValue(
                            JSON.stringify(selectedFile),
                          );
                        }
                      }
                    }}
                  >
                    Upload Image
                  </Button>
                  {spriteImageDialogValue && (
                    <p className="text-sm">
                      Selected image(s):{" "}
                      {JSON.parse(spriteImageDialogValue).map(
                        (path: string, index: number) => (
                          <span key={index}>
                            <span
                              className=" text-blue-500 hover:cursor-pointer hover:underline"
                              onClick={async () => {
                                await openPath(path);
                              }}
                            >
                              {path.split("/").pop()}
                            </span>
                            {index <
                            JSON.parse(spriteImageDialogValue).length - 1
                              ? ", "
                              : ""}
                          </span>
                        ),
                      )}
                    </p>
                  )}
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline">Cancel</Button>}
                />
                <Button
                  disabled={!spriteImageDialogValue || !spriteNameDialogValue}
                  onClick={async () => {
                    if (!spriteImageDialogValue || !spriteNameDialogValue) {
                      return;
                    }
                    const files = JSON.parse(spriteImageDialogValue);
                    let fileNames = [];
                    for (const file of files) {
                      const last = file.split("/").pop();
                      if (!last) {
                        return;
                      }
                      fileNames.push(last);
                      await copyFile(file, last, {
                        toPathBaseDir: BaseDirectory.AppLocalData,
                      });
                    }
                    console.log("Copied files:", fileNames);
                    let formattedFileNames = fileNames.map((name) => ({
                      costumeName: name.split(".")[0],
                      loadablePath: convertFileSrc(
                        `${_appDataDir.current}/${name}`,
                      ),
                    }));
                    await new DatabaseManager().addNewSprite(
                      spriteNameDialogValue,
                      formattedFileNames,
                      1,
                    );
                    importDatabaseData();
                    setSpriteDialogOpen(false);
                  }}
                  type="submit"
                >
                  Add sprite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    );
  }

  async function setupWorkspace() {
    console.log("Setting up workspace...");
    Blockly.utils.colour.setHsvSaturation(0.75);
    Blockly.utils.colour.setHsvValue(0.65);
    if (!Blockly.getMainWorkspace()) {
      Blockly.common.defineBlocks(blocks);
      Blockly.Extensions.register("costume_dropdown_extension", function () {
        //@ts-ignore
        this.getField("COSTUME").setOptions(function () {
          const options = [];

          if (
            activeSpriteRef.current?.image_paths &&
            activeSpriteRef.current?.image_paths.length > 0
          ) {
            activeSpriteRef.current?.image_paths.forEach((costume) => {
              options.push([costume.costumeName, costume.loadablePath]);
            });
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
          console.log(`Setting broadcast options with:`, toSet);
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
        function refreshBroadcastFields(messages: [string, string][]) {
          const workspace = Blockly.getMainWorkspace();

          if (!workspace) {
            return;
          }

          const options = optionsFn(messages);

          for (const block of workspace.getAllBlocks(false)) {
            const field = block.getField("BROADCAST");

            if (field) {
              //@ts-ignore
              field.setOptions(options);
            }
          }
          //@ts-ignore
          workspace.refreshToolboxSelection();
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
          colour: "60",
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
            <SpriteSelector />
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
            <SpriteSelector />
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
                  height="450"
                ></canvas>
                <canvas
                  className="absolute border border-slate-300 rounded-lg"
                  id="foregroundCanvas"
                  width="800"
                  height="450"
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
