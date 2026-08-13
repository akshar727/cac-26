import "./App.css";
import * as React from "react";
import Database from "@tauri-apps/plugin-sql";
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
import { BlocklyPromptDialog } from "./components/BlocklyPromptDialog";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "./components/ui/button";
import { copyFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { useRef } from "react";
import { shadowBlockConversionChangeListener } from "@blockly/shadow-block-converter";
import { registerContinuousToolbox } from "@blockly/continuous-toolbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "./components/ui/skeleton";
import { appDataDir } from "@tauri-apps/api/path";
import { AssetDatabaseSprite, DatabaseSprite } from "@/types/sprite";
import { Runtime } from "@/runner/runtime";
import { registerFieldAngle } from "@blockly/field-angle";

function App() {
  const activeSpriteRef = useRef<DatabaseSprite | null>(null);
  const [codePreview, setCodePreview] = React.useState<string>("");
  const [workspace, setWorkspace] = React.useState<Blockly.WorkspaceSvg | null>(
    null,
  );
  const [activeSprite, setActiveSprite] = React.useState<DatabaseSprite | null>(
    null,
  );
  const [sprites, setSprites] = React.useState<DatabaseSprite[]>([]);
  const [assetSprites, setAssetSprites] = React.useState<AssetDatabaseSprite[]>(
    [],
  );
  const [spriteImageDialogValue, setSpriteImageDialogValue] = React.useState<
    string | null
  >(null);
  const [spriteNameDialogValue, setSpriteNameDialogValue] = React.useState<
    string | null
  >(null);
  const [spriteDialogOpen, setSpriteDialogOpen] = React.useState(false);
  const _appDataDir = React.useRef<string | null>(null);
  const [codeStopped, setCodeStopped] = React.useState(false);

  // change ref
  React.useEffect(() => {
    activeSpriteRef.current = activeSprite;
  }, [activeSprite]);

  React.useEffect(() => {
    const newAssetSprites: AssetDatabaseSprite[] = sprites.map((sprite) => {
      return {
        ...sprite,
        loadableImagePaths: JSON.parse(sprite.image_paths || "[]").map(
          (path: string) => {
            return convertFileSrc(`${_appDataDir.current}/${path}`);
          },
        ),
      };
    });
    setAssetSprites(newAssetSprites);
  }, [sprites]);

  // this effect should only add stuff into the workspace, not fetch data.
  React.useEffect(() => {
    (async () => {
      if (!Blockly.getMainWorkspace()) return;
      Blockly.Events.disable();
      try {
        Blockly.getMainWorkspace().clear();
        if (!activeSprite || !activeSprite?.blocks_json) return;
        for (const variable of JSON.parse(
          activeSprite?.variables_map || "[]",
        )) {
          Blockly.getMainWorkspace().getVariableMap().clear();
          Blockly.getMainWorkspace()
            .getVariableMap()
            .createVariable(
              variable.name,
              variable.type || undefined,
              variable.id,
            );
        }
        for (const block of JSON.parse(activeSprite?.blocks_json || "[]")) {
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
    const db = await Database.load("sqlite:cac.db");
    const result = await db.select<DatabaseSprite[]>(
      `SELECT * from sprites WHERE project_id = 1`,
    );
    // console.log("Sprites from database:", result);
    setSprites(result);
    if (!activeSprite && result.length > 0) {
      setActiveSprite(result[0]);
      // console.log("Active sprite set to:", result[0]);
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
  }

  const runCode = () => {
    if (!Blockly.getMainWorkspace()) return;
    Blockly.Events.disable();
    try {
      const runtime = new Runtime(assetSprites);
      runtime.start();
      window.addEventListener("keydown", (event) => {
        runtime.keyPressed(event.key);
      });
      setCodeStopped(false);
      let prev = performance.now();
      function step() {
        const now = performance.now();
        const deltaTime = (now - prev) / 1000; // Convert to seconds
        prev = now;
        runtime.tick(deltaTime, now);
        if (!codeStopped) {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    } finally {
      Blockly.Events.enable();
    }
  };

  const stopCode = () => {
    setCodeStopped(true);
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
      const variableState = Blockly.getMainWorkspace()
        .getVariableMap()
        .getAllVariables();
      const savedVariables = variableState.map((v) => ({
        id: v.getId(),
        name: v.getName(),
        type: v.getType() || "",
      }));
      const db = await Database.load("sqlite:cac.db");
      await db.execute(`UPDATE sprites SET blocks_json = ? WHERE id = ?`, [
        JSON.stringify(fullJson),
        currentActiveSprite.id,
      ]);
      await db.execute(`UPDATE sprites SET variables_map = ? WHERE id = ?`, [
        JSON.stringify(savedVariables),
        currentActiveSprite.id,
      ]);
      setSprites((prevSprites) =>
        prevSprites.map((sprite) =>
          sprite.id === currentActiveSprite.id
            ? {
                ...sprite,
                blocks_json: JSON.stringify(fullJson),
                variables_map: JSON.stringify(savedVariables),
              }
            : sprite,
        ),
      );
    })();
  }

  async function setupWorkspace() {
    console.log("Setting up workspace...");
    Blockly.utils.colour.setHsvSaturation(0.75);
    Blockly.utils.colour.setHsvValue(0.65);
    if (!Blockly.getMainWorkspace()) {
      registerFieldAngle();
      Blockly.common.defineBlocks(blocks);
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
    let ws = Blockly.inject(blocklyDiv, {
      toolbox: toolbox,
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
    Blockly.svgResize(ws);
    ws.addChangeListener(shadowBlockConversionChangeListener);
    Blockly.dialog.setPrompt(
      (
        message: string,
        defaultValue: string,
        callback: (value: string | null) => void,
      ) => {
        const promptEvent = new CustomEvent("blockly-prompt", {
          detail: { message, defaultValue, callback },
        });
        window.dispatchEvent(promptEvent);
      },
    );
    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      // UI events are things like scrolling, zooming, etc.
      // No need to save after one of these.
      if (e.isUiEvent) return;
      // console.log(e);
      setTimeout(() => {
        saveCurrentWorkspaceToDatabase();
      }, 0);
    });
  }

  return (
    <main className="p-2 bg-slate-50 dark:bg-slate-800 min-h-dvh h-dvh max-h-dvh text-slate-900">
      <h1>Blockly</h1>
      <Tabs
        defaultValue="blocks"
        onValueChange={(value) => {
          async function change() {
            // console.log("Tab changed to:", value);
            if (value === "blocks") {
              await importDatabaseData();
              await setupWorkspace();
              setTimeout(() => {
                const workspace = Blockly.getMainWorkspace();
                Blockly.svgResize(workspace as Blockly.WorkspaceSvg);
                // console.log("Resized workspace after switching to blocks tab.");
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
          <TabsTrigger value="screen">Screen</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks" className="w-full h-full max-w-dvw">
          <div
            id="pageContainer"
            className="flex w-full h-full max-w-dvw gap-2"
          >
            <div className="flex-5" id="blocklyDiv"></div>
            <Card className="flex-2 justify-between">
              <CardContent className="flex flex-col gap-2">
                <CardTitle>Sprites</CardTitle>
                {assetSprites.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {assetSprites.map((sprite: AssetDatabaseSprite) => {
                      return (
                        <Card
                          className="hover:cursor-pointer hover:bg-slate-100 transition-colors duration-200"
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
                            {sprite.image_paths === "" ||
                            sprite.image_paths === "[]" ? (
                              <Skeleton className="w-16 h-16" />
                            ) : (
                              <img
                                src={sprite.loadableImagePaths[0]}
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
                            <p
                              className={`text-sm text-center ${activeSprite?.id === sprite.id ? "text-blue-500 font-medium" : ""}`}
                            >
                              {sprite.name}
                            </p>
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
                    render={
                      <Button onClick={async () => {}}>Add a sprite</Button>
                    }
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
                          onChange={(e) =>
                            setSpriteNameDialogValue(e.target.value)
                          }
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
                                setSpriteImageDialogValue(
                                  "[" + selectedFile + "]",
                                );
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
                        disabled={
                          !spriteImageDialogValue || !spriteNameDialogValue
                        }
                        onClick={async () => {
                          if (
                            !spriteImageDialogValue ||
                            !spriteNameDialogValue
                          ) {
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
                          const db = await Database.load("sqlite:cac.db");
                          await db.execute(
                            `INSERT INTO sprites (name, image_paths, project_id) VALUES (?, ?, ?)`,
                            [
                              spriteNameDialogValue,
                              JSON.stringify(fileNames),
                              1,
                            ],
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
                >
                  Run Code
                </Button>
                <Button
                  onClick={() => {
                    stopCode();
                  }}
                >
                  Stop Code
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <code className="text-sm font-mono max-w-full overflow-x-auto">
        {codePreview}
      </code>
      <BlocklyPromptDialog />
    </main>
  );
}

export default App;
