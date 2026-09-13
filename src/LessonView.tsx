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
import { Lesson } from "./types/lesson";

function LessonView({
  lessonId,
  cb,
}: {
  lessonId: number | null;
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
  const lessonSpritesRef = React.useRef<(DatabaseSprite | DatabaseBackdrop)[]>(
    [],
  );
  const [lesson, setLesson] = React.useState<Lesson | null>(null);
  const lessonRef = React.useRef<Lesson | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const currentStepRef = React.useRef(0);
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

  React.useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  React.useEffect(() => {
    currentStepRef.current = currentStep;
    if (workspace && lesson) {
      workspace.updateToolbox(createLessonToolbox(lesson, currentStep));
    }
  }, [currentStep, lesson, workspace]);

  React.useEffect(() => {
    setCurrentStep(0);
    currentStepRef.current = 0;
  }, [lessonId]);

  function createLessonToolbox(currentLesson: Lesson, step: number) {
    const allowedTypes = new Set(
      typeof currentLesson.allowedBlocks[0] === "string"
        ? (currentLesson.allowedBlocks as string[])
        : ((currentLesson.allowedBlocks as string[][])[step] ?? []),
    );

    const filterContents = (contents: any[]): any[] =>
      contents.reduce((filtered, item) => {
        if (item.kind === "category") {
          if (item.name === "Functions") return filtered;
          if (item.custom === "VARIABLE") {
            if (
              allowedTypes.has("variables_set") ||
              allowedTypes.has("variables_get") ||
              allowedTypes.has("math_change")
            ) {
              filtered.push(item);
            }
            return filtered;
          }
          const contents = filterContents(item.contents ?? []);
          if (contents.length > 0) {
            filtered.push({ ...item, contents });
          }
          return filtered;
        }

        if (item.kind !== "block" || allowedTypes.has(item.type)) {
          filtered.push(item);
        }
        return filtered;
      }, []);

    return {
      ...toolbox,
      contents: filterContents(toolbox.contents),
    };
  }

  function evaluateLessonMetric(metric: any): boolean {
    const workspace = Blockly.getMainWorkspace();
    if (!workspace || !metric) return false;
    if (metric.check === "codeRan") {
      return codeRunning.current;
    }

    if (metric.check === "predicate") {
      const target = runtimeRef.current?._targets.find(
        (item) => !item.isBackdrop,
      );
      if (!target || !metric.expression) return false;
      try {
        return new Function("target", `return Boolean(${metric.expression});`)(
          target,
        );
      } catch (error) {
        console.error("Invalid lesson predicate:", metric.expression, error);
        return false;
      }
    }

    if (metric.check === "variable") {
      const spritesToCheck =
        metric.spriteId === undefined
          ? lessonSpritesRef.current
          : lessonSpritesRef.current.filter(
              (sprite) => sprite.id === metric.spriteId,
            );
      return spritesToCheck.some((sprite) =>
        sprite.variables_map.some(
          (variable) =>
            variable.name === metric.name &&
            (metric.global === undefined ||
              variable.isGlobal === metric.global),
        ),
      );
    }

    if (metric.check === "broadcast") {
      return broadcastMessagesRef.current.some(
        ([name, value]) => name === metric.name || value === metric.name,
      );
    }

    if (metric.check === "costumeCount") {
      const sprite = lessonSpritesRef.current.find(
        (candidate) => candidate.id === metric.spriteId,
      );
      return Boolean(sprite && sprite.image_paths.length >= metric.minimum);
    }

    if (metric.check === "spriteCount") {
      return (
        lessonSpritesRef.current.filter((sprite) => !("isBackdrop" in sprite))
          .length >= metric.minimum
      );
    }

    if (metric.check === "blockCount") {
      const blockCount = workspace
        .getAllBlocks(false)
        .filter((block) => !block.isShadow()).length;
      return (
        (metric.minimum === undefined || blockCount >= metric.minimum) &&
        (metric.maximum === undefined || blockCount <= metric.maximum)
      );
    }

    if (metric.check !== "exists" || !metric.blockType) return false;

    let metricWorkspace = workspace;
    if (metric.spriteId !== undefined) {
      const sprite = lessonSpritesRef.current.find(
        (candidate) => candidate.id === metric.spriteId,
      );
      if (!sprite) return false;

      metricWorkspace = new Blockly.Workspace();
      for (const block of sprite.blocks_json) {
        Blockly.serialization.blocks.append(block, metricWorkspace);
      }
    }

    // console.warn("Running a EXISTS check");
    function matchesMetric(block: Blockly.Block, expected: any): boolean {
      if (Array.isArray(expected)) {
        for (const exp of expected) {
          if (matchesMetric(block, exp)) {
            return true;
          }
        }
        console.log(
          `Block ${block.type} does not match any of the expected metrics:`,
          expected,
        );
        return false;
      }
      if (!block) {
        console.error("NULL block: ", expected);
        return false;
      }
      if (
        block.type &&
        expected.blockType &&
        block.type !== expected.blockType
      ) {
        return false;
      }
      if (expected.inputs) {
        for (const [inputName, expectedValue] of Object.entries(
          expected.inputs,
        )) {
          const input = block.getInput(inputName);
          if (!input?.connection?.targetBlock()) {
            console.error(`Input ${inputName} not found on block`, block.type);
            return false;
          }
          if (
            !input ||
            !matchesMetric(input.connection?.targetBlock()!, expectedValue)
          ) {
            console.log(
              `Input ${inputName} on block`,
              block.type,
              `${input.connection?.targetBlock()?.type}`,
              "does not match expected value:",
              expectedValue,
            );
            return false;
          }
        }
      }
      if (expected.fields) {
        for (const [fieldName, expectedValue] of Object.entries(
          expected.fields,
        )) {
          const field = block.getField(fieldName);
          let val = field?.getValue();
          if (
            fieldName === "VAR" &&
            (block.type === "variables_set" ||
              block.type === "variables_get" ||
              block.type === "math_change")
          ) {
            // Do nothing, this is a special case
            val = lessonSpritesRef.current
              .find((sprite) =>
                sprite.variables_map.some((variable) => variable.id === val),
              )
              ?.variables_map.find((variable) => variable.id === val)?.name;
          }
          if (!field || String(val) !== String(expectedValue)) {
            console.log(
              `Field ${fieldName} on block`,
              block.type,
              `${field?.getValue()}`,
              "does not match expected value:",
              expectedValue,
            );
            return false;
          }
        }
      }
      if (expected.next) {
        const nextBlock = block.getNextBlock();
        return nextBlock ? matchesMetric(nextBlock, expected.next) : false;
      }
      if (!expected.next) return true;
      return false;
    }

    const matches = metricWorkspace
      .getTopBlocks(false)
      .some((block) => matchesMetric(block, metric));
    if (metricWorkspace !== workspace) {
      metricWorkspace.dispose();
    }
    return matches;
  }

  function reconcileLessonProgress() {
    const currentLesson = lessonRef.current;
    if (!currentLesson) return;
    if (currentStepRef.current >= currentLesson.successMetrics.length) return;
    const metrics = currentLesson.successMetrics;
    const completedCount = Math.min(currentStepRef.current, metrics.length);

    for (let index = 0; index < completedCount; index++) {
      if (
        !evaluateLessonMetric(metrics[index]) &&
        metrics[index].check !== "codeRan"
      ) {
        currentStepRef.current = index;
        setCurrentStep(index);
        return;
      }
    }
    let nextStep = currentStepRef.current;
    while (
      nextStep < metrics.length &&
      evaluateLessonMetric(metrics[nextStep])
    ) {
      nextStep += 1;
    }

    if (nextStep !== currentStepRef.current) {
      currentStepRef.current = nextStep;
      setCurrentStep(nextStep);
    }
  }

  function renderBasePositions() {
    if (sprites.length === 0) return;
    const runtime = new Runtime(sprites, () => runtimeRef.current?.render());
    runtimeRef.current = runtime;
    runtime.render();
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
      const loadedLesson = await importDatabaseData();
      await setupWorkspace(loadedLesson);
      _appDataDir.current = await appDataDir();
    }
    setup();
  }, []);

  async function importDatabaseData(): Promise<Lesson | null> {
    if (lessonId === null) return null;

    const dbManager = new DatabaseManager();
    const lessonResult = await dbManager.getLesson(lessonId);
    const spritesResult = await dbManager.getSpritesForLesson(lessonId);
    setLesson(lessonResult);
    lessonRef.current = lessonResult;
    setSprites(spritesResult);
    lessonSpritesRef.current = spritesResult;
    const firstSprite = spritesResult.find(
      (sprite) => !("isBackdrop" in sprite),
    );
    if (!activeSprite && firstSprite) {
      setActiveSprite(firstSprite);
    } else {
      setActiveSprite((prevActiveSprite) => {
        return (
          spritesResult.find((sprite) => sprite.id === prevActiveSprite?.id) ??
          firstSprite ??
          null
        );
      });
    }
    broadcastMessagesRef.current = lessonResult.baseState.broadcasts.map(
      (broadcast) => [broadcast.name, broadcast.name],
    );
    return lessonResult;
  }

  async function refreshLessonData(): Promise<void> {
    if (lessonId === null) return;
    setSprites(lessonSpritesRef.current);
  }

  const runCode = () => {
    if (!Blockly.getMainWorkspace()) return;
    Blockly.Events.disable();
    try {
      setCodeRunningState(true);
      codeRunning.current = true;
      const workspace = Blockly.getMainWorkspace();
      const currentBlocks = workspace
        ?.getTopBlocks(false)
        .map((block) => Blockly.serialization.blocks.save(block));
      const runtimeSprites = sprites.map((sprite) =>
        sprite.id === activeSpriteRef.current?.id
          ? { ...sprite, blocks_json: currentBlocks ?? sprite.blocks_json }
          : sprite,
      );
      const runtime = new Runtime(runtimeSprites, () =>
        runtimeRef.current?.render(),
      );
      runtimeRef.current = runtime;
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
      const mouseDownEvent = (_event: MouseEvent) => {
        runtime._mouseDown = true;
      };
      const mouseUpEvent = (_event: MouseEvent) => {
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
          if (lessonId !== null) reconcileLessonProgress();
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
        }
      }
      requestAnimationFrame(step);
    } finally {
      Blockly.Events.enable();
    }
  };

  const stopCode = () => {
    codeRunning.current = false;
    runtimeRef.current?.stopAll();
  };

  function saveCurrentWorkspaceToDatabase() {
    if (!Blockly.getMainWorkspace()) {
      return;
    }
    let realId =
      activeSpriteRef.current && "isBackdrop" in activeSpriteRef.current
        ? -activeSpriteRef.current.id
        : activeSpriteRef.current?.id; // we do this to get back to the actual id of the backdrop in the database (negative numbers just work well here)
    // console.warn("Saving workspace for sprite with id:", realId);
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

    if (lessonId !== null) {
      const spriteId = currentActiveSprite.id;
      const updatedSprites = lessonSpritesRef.current.map((sprite) =>
        sprite.id === spriteId
          ? {
              ...sprite,
              blocks_json: fullJson,
              variables_map: [...currentActiveSprite.variables_map],
            }
          : sprite,
      );
      lessonSpritesRef.current = updatedSprites;
      setSprites(updatedSprites);
      return;
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

  async function setupWorkspace(currentLesson: Lesson | null = lesson) {
    console.log("Setting up workspace...");
    Blockly.utils.colour.setHsvSaturation(0.89);
    Blockly.utils.colour.setHsvValue(0.85);
    if (!Blockly.getMainWorkspace()) {
      Blockly.common.defineBlocks(blocks);
      loops.loopTypes.add("controls_forever"); //register it as a loop block so break/continue doesnt look grayed out
    }
    try {
      Blockly.Extensions.register("costume_dropdown_extension", function () {
        // @ts-ignore
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
          console.log(options);
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
                  reconcileLessonProgress();
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
                  reconcileLessonProgress();
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
      // it doesn't matter
    }
    const theme = Blockly.Theme.defineTheme("codely", {
      name: "codely",
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
    const filteredToolbox = currentLesson
      ? createLessonToolbox(currentLesson, currentStepRef.current)
      : toolbox;
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
        if (!variableId || !activeSpriteRef.current) return;
        console.log("Deleting variable:", variableId);

        void (async () => {
          try {
            const currentSprite = activeSpriteRef.current!;
            if (lessonId !== null) {
              const updatedSprites = lessonSpritesRef.current.map((sprite) =>
                sprite.id === currentSprite.id
                  ? {
                      ...sprite,
                      variables_map: sprite.variables_map.filter(
                        (variable) => variable.id !== variableId,
                      ),
                    }
                  : sprite,
              );
              lessonSpritesRef.current = updatedSprites;
              setSprites(updatedSprites);
              const updatedActiveSprite = updatedSprites.find(
                (sprite) => sprite.id === currentSprite.id,
              );
              if (updatedActiveSprite) {
                activeSpriteRef.current = updatedActiveSprite;
                setActiveSprite(updatedActiveSprite);
              }
              reconcileLessonProgress();
            } else {
              await new DatabaseManager().deleteVariableFromSprite(
                currentSprite.id,
                variableId,
                "isBackdrop" in currentSprite && currentSprite.isBackdrop,
              );
              await importDatabaseData();
            }
          } catch (error) {
            console.error("Error deleting variable:", error);
          }
        })();
      }
      if (e.isUiEvent) return;
      saveCurrentWorkspaceToDatabase();
      if (lessonId !== null && e.type !== Blockly.Events.BLOCK_CREATE) {
        // random bug that exists when this runs on block_create so its not necessary to check then
        reconcileLessonProgress();
      }
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
    ws.updateToolbox(filteredToolbox);
    Blockly.svgResize(ws);
    ws.addChangeListener(shadowBlockConversionChangeListener);
    Blockly.dialog.setPrompt(
      (
        message: string,
        defaultValue: string,
        originalCallback: (value: string | null) => void,
      ) => {
        function createNewVariable(name: string | null, isGlobal: boolean) {
          if (!name || !activeSpriteRef.current) {
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
                const currentSprite = activeSpriteRef.current;
                if (!currentSprite) return;
                if (lessonId !== null) {
                  const updatedSprites = lessonSpritesRef.current.map(
                    (sprite) =>
                      sprite.id === currentSprite.id
                        ? {
                            ...sprite,
                            variables_map: [
                              ...sprite.variables_map,
                              {
                                id: variable.getId(),
                                name: variable.getName(),
                                isGlobal,
                              },
                            ],
                          }
                        : sprite,
                  );
                  lessonSpritesRef.current = updatedSprites;
                  setSprites(updatedSprites);
                  activeSpriteRef.current =
                    updatedSprites.find(
                      (sprite) => sprite.id === currentSprite.id,
                    ) ?? currentSprite;
                  setActiveSprite(activeSpriteRef.current);
                  reconcileLessonProgress();
                } else {
                  await new DatabaseManager().addVariableToSprite(
                    currentSprite.id,
                    variable.getId(),
                    variable.getName(),
                    isGlobal,
                    "isBackdrop" in currentSprite && currentSprite.isBackdrop,
                  );
                  await importDatabaseData();
                }
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
    <main className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 p-2 text-slate-900 dark:bg-slate-800">
      {lesson && (
        <section className="mb-1 shrink-0 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{lesson.name}</h1>
              <p className=" text-sm text-muted-foreground">
                {lesson.longDescription}
              </p>
            </div>
          </div>
          <p className=" text-sm">
            {lesson.instructions[currentStep] ?? "Lesson complete."}
          </p>
          <p className="shrink-0 text-sm font-medium text-muted-foreground">
            Step {Math.min(currentStep + 1, lesson.instructions.length)} of{" "}
            {lesson.instructions.length}
          </p>
        </section>
      )}
      <Tabs
        defaultValue="blocks"
        onValueChange={(value) => {
          async function change() {
            if (value === "blocks") {
              if (lessonId === null) {
                await importDatabaseData();
                await setupWorkspace();
              }
              setTimeout(() => {
                const workspace = Blockly.getMainWorkspace();
                Blockly.svgResize(workspace as Blockly.WorkspaceSvg);
              }, 100);
            } else {
              saveCurrentWorkspaceToDatabase();
              if (value === "screen") {
                setTimeout(() => {
                  renderBasePositions();
                }, 100);
              }
            }
          }
          change();
        }}
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        <TabsList>
          <TabsTrigger value="blocks">Code</TabsTrigger>
          <TabsTrigger value="costumes">Costumes</TabsTrigger>
          <TabsTrigger value="screen">Screen</TabsTrigger>
        </TabsList>
        <TabsContent
          value="blocks"
          keepMounted
          className="min-h-0 w-full flex-1 max-w-dvw"
        >
          <div
            id="pageContainer"
            className="flex h-full min-h-0 w-full max-w-dvw gap-2"
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
              projectId={lessonId}
              importDatabaseData={refreshLessonData}
              isLesson
            />
          </div>
        </TabsContent>
        <TabsContent
          value="costumes"
          className="min-h-0 w-full flex-1 max-w-dvw"
        >
          <div
            id="pageContainer"
            className="flex h-full min-h-0 w-full max-w-dvw gap-2"
          >
            <div className="flex-5 gap-1 flex flex-row">
              <CostumeEditor
                //@ts-ignore
                activeSprite={activeSprite}
                appDataDir={_appDataDir.current || ""}
                refreshDataCallback={refreshLessonData}
                projectId={lessonId || 0}
                isLesson
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
              projectId={lessonId}
              importDatabaseData={refreshLessonData}
              isLesson
            />
          </div>
        </TabsContent>
        <TabsContent value="screen" className="min-h-0 w-full flex-1 max-w-dvw">
          <div
            id="pageContainer"
            className="flex h-full min-h-0 w-full max-w-dvw gap-2"
          >
            <Card
              id="outputPane"
              className="flex flex-col min-w-2/5 w-full overflow-auto"
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
              <CardFooter className="flex p-1 justify-center gap-1 items-center">
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
        className="absolute right-4 top-4"
      >
        <Undo2 />
        Back to Menu
      </Button>
      <BlocklyVariablePromptDialog />
      <BroadcastPromptDialog />
    </main>
  );
}

export default LessonView;
