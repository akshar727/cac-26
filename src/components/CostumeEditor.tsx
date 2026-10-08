import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardTitle } from "./ui/card";
import { DatabaseSprite } from "@/types/database";
import { DatabaseManager } from "@/lib/database";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { copyFile, BaseDirectory, mkdir, exists } from "@tauri-apps/plugin-fs";
import { Field } from "@/components/ui/field";
import { DialogContent, DialogFooter } from "./ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { Input } from "./ui/input";
import {
  baseNameOf,
  cn,
  fileNameFromPath,
  openImage,
  uniqueFileName,
} from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, X } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { UniqueIdentifier } from "@dnd-kit/abstract";

type Costume = DatabaseSprite["image_paths"][number];

function SortableCostumeCard({
  costume,
  index,
  isActive,
  isLesson,
  canDelete,
  onSelect,
  onDelete,
}: {
  costume: Costume;
  index: number;
  isActive: boolean;
  isLesson: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
}) {
  const id = costume.loadablePath as UniqueIdentifier;
  const { isDragging, ref } = useSortable({
    id,
    index,
    group: "costumes",
    disabled: isLesson,
  });

  return (
    <Dialog>
      <Card
        ref={ref}
        onClick={onSelect}
        className={cn(
          "hover:cursor-grab hover:bg-slate-100 transition-colors duration-200 relative",
          isActive ? "bg-slate-100" : "",
          isDragging ? "opacity-50" : "",
        )}
      >
        <Tooltip>
          {!isLesson && canDelete ? (
            <DialogTrigger
              nativeButton={false}
              render={
                <TooltipTrigger
                  render={
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete costume ${costume.costumeName}`}
                      className="hover:cursor-pointer absolute top-0 right-0 z-10 rounded-lg hover:bg-red-500/40 focus-visible:outline-2 focus-visible:outline-ring transition-colors duration-100 bg-gray-200/30 flex justify-end m-2 p-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <X className="w-4 h-4" />
                    </div>
                  }
                />
              }
            />
          ) : !isLesson ? (
            <TooltipTrigger
              render={
                <div
                  className="hover:cursor-pointer absolute top-0 right-0 z-10 rounded-lg hover:bg-red-500/40 transition-colors duration-100 bg-gray-200/30 flex justify-end m-2 p-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <X className="w-4 h-4" />
                </div>
              }
            />
          ) : null}
          {!isLesson && !canDelete && (
            <TooltipContent>
              <p>You cannot delete the only costume of a sprite.</p>
            </TooltipContent>
          )}
        </Tooltip>
        <button
          type="button"
          aria-pressed={isActive}
          aria-label={`Select costume ${costume.costumeName}`}
          className="w-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <CardContent className="flex relative flex-col items-center gap-2">
            <img
              src={costume.loadablePath}
              alt=""
              style={{
                maxWidth: 64,
                maxHeight: 64,
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
            <p className="text-sm text-center">{costume.costumeName}</p>
            <ImageSpecs loadablePath={costume.loadablePath} />
          </CardContent>
        </button>
      </Card>
      {!isLesson && canDelete && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this costume?</DialogTitle>
          </DialogHeader>
          This is a permanent action and cannot be undone.
          <DialogFooter className="bg-white">
            <DialogClose
              render={
                <Button variant="destructive" onClick={onDelete}>
                  Delete Costume
                </Button>
              }
            />
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ImageSpecs({ loadablePath }: { loadablePath: string }) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!loadablePath) return;

    const img = new Image();
    img.src = loadablePath;
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
    };
  }, [loadablePath]);

  if (!dimensions)
    return <span className="text-xs text-muted-foreground">Loading...</span>;

  return (
    <p className="text-xs text-muted-foreground">
      {dimensions.width} x {dimensions.height}
    </p>
  );
}

export default function CostumeEdtior({
  activeSprite,
  refreshDataCallback,
  appDataDir,
  projectId,
  isLesson = false,
}: {
  activeSprite: DatabaseSprite | null;
  refreshDataCallback: () => Promise<void>;
  appDataDir: string;
  projectId: number;
  isLesson?: boolean;
}) {
  const [activeCostume, setActiveCostume] = useState<
    DatabaseSprite["image_paths"][0] | null
  >(
    activeSprite && activeSprite.image_paths.length > 0
      ? activeSprite.image_paths[0]
      : null,
  );

  const [newCostumeDialogOpen, setNewCostumeDialogOpen] = useState(false);
  const [spriteImageDialogValue, setSpriteImageDialogValue] = useState("");
  const [spriteNameDialogValue, setSpriteNameDialogValue] = useState("");
  const [costumes, setCostumes] = useState<Costume[]>(
    activeSprite?.image_paths ?? [],
  );

  useEffect(() => {
    setCostumes(activeSprite?.image_paths ?? []);
    if (activeSprite && activeSprite.image_paths.length > 0) {
      setActiveCostume(activeSprite.image_paths[0]);
    } else if (activeSprite && activeSprite.image_paths.length === 0) {
      setActiveCostume(null);
    }
  }, [activeSprite]);

  if (!activeSprite) {
    return (
      <Card className="h-full flex-2">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Current Costume</CardTitle>
          <p>No sprite selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex-1 min-w-40 flex justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>
            {(activeSprite?.id || 1) < 0 ? "Backdrops" : "Costumes"}
          </CardTitle>
          {activeSprite && activeSprite.image_paths.length > 0 ? (
            <DragDropProvider
              onDragEnd={async ({ operation, canceled }) => {
                if (canceled) return;
                const source = operation.source as {
                  initialIndex?: number;
                  index?: number;
                } | null;
                const sourceIndex = source?.initialIndex;
                const targetIndex = source?.index;
                if (
                  sourceIndex == null ||
                  targetIndex == null ||
                  sourceIndex === targetIndex ||
                  sourceIndex < 0 ||
                  targetIndex < 0 ||
                  sourceIndex >= costumes.length ||
                  targetIndex >= costumes.length
                ) {
                  return;
                }
                const nextCostumes = [...costumes];
                const [movedCostume] = nextCostumes.splice(sourceIndex, 1);
                nextCostumes.splice(targetIndex, 0, movedCostume);
                setCostumes(nextCostumes);
                await new DatabaseManager().updateCostumeOrder(
                  "isBackdrop" in activeSprite && activeSprite.isBackdrop
                    ? -activeSprite.id
                    : activeSprite.id,
                  nextCostumes,
                  "isBackdrop" in activeSprite &&
                    Boolean(activeSprite.isBackdrop),
                );
                await refreshDataCallback();
              }}
            >
              <ScrollArea>
                <div className="grid grid-cols-1 gap-2 p-1">
                  {costumes.map((costume, index) => (
                    <SortableCostumeCard
                      key={costume.loadablePath}
                      costume={costume}
                      index={index}
                      isActive={
                        activeCostume?.loadablePath === costume.loadablePath
                      }
                      isLesson={isLesson}
                      canDelete={costumes.length > 1}
                      onSelect={() => setActiveCostume(costume)}
                      onDelete={async () => {
                        await new DatabaseManager().deleteCostume(
                          costume.loadablePath,
                          costumes,
                          "isBackdrop" in activeSprite &&
                            activeSprite.isBackdrop
                            ? -activeSprite.id
                            : activeSprite.id,
                          "isBackdrop" in activeSprite &&
                            Boolean(activeSprite.isBackdrop),
                        );
                        await refreshDataCallback();
                        setActiveCostume(null);
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </DragDropProvider>
          ) : (
            <div className="flex flex-col gap-2">
              <p>No costumes available for this sprite.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!isLesson && (
            <Dialog
              open={newCostumeDialogOpen}
              onOpenChange={setNewCostumeDialogOpen}
              onOpenChangeComplete={() => {
                setSpriteImageDialogValue("");
                setSpriteNameDialogValue("");
              }}
            >
              <DialogTrigger
                render={
                  <Button
                    onClick={async () => {
                      setNewCostumeDialogOpen(true);
                    }}
                  >
                    <Plus />
                    Add a {(activeSprite?.id || 1) < 0 ? "backdrop" : "costume"}
                  </Button>
                }
              />
              <DialogContent>
                <DialogTitle>
                  Add a new{" "}
                  {(activeSprite?.id || 1) < 0 ? "backdrop" : "costume"}
                </DialogTitle>
                <DialogDescription>
                  Select an image file to add as a{" "}
                  {(activeSprite?.id || 1) < 0 ? "backdrop" : "costume"} for the
                  sprite.
                </DialogDescription>
                <FieldGroup>
                  <Field>
                    <Label htmlFor="spriteName">
                      {(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}{" "}
                      Name
                    </Label>
                    <Input
                      type="text"
                      id="spriteName"
                      value={spriteNameDialogValue}
                      onChange={(e) => setSpriteNameDialogValue(e.target.value)}
                      placeholder={`Enter ${(activeSprite?.id || 1) < 0 ? "backdrop" : "costume"} name`}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="spriteImage">
                      {(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}{" "}
                      Image
                    </Label>
                    <Button
                      onClick={async () => {
                        const selectedFile = await open({
                          multiple: false,
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
                            setSpriteImageDialogValue(selectedFile);
                          }
                        }
                      }}
                    >
                      Upload Image
                    </Button>
                    {spriteImageDialogValue && (
                      <p className="text-sm">
                        Selected image:{" "}
                        <span
                          className=" text-blue-500 hover:cursor-pointer hover:underline"
                          onClick={async () => {
                            const path = spriteImageDialogValue;
                            await openImage(path);
                          }}
                        >
                          {fileNameFromPath(spriteImageDialogValue)}
                        </span>
                      </p>
                    )}
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Cancel</Button>}
                  />
                  <Button
                    disabled={!spriteImageDialogValue}
                    onClick={async () => {
                      if (!spriteImageDialogValue) {
                        return;
                      }
                      const file = spriteImageDialogValue;
                      const originalName = fileNameFromPath(file);
                      if (!originalName) {
                        return;
                      }
                      const last = uniqueFileName(originalName);
                      const projectFolderName = `proj_${projectId}`;
                      const folderExists = await exists(projectFolderName, {
                        baseDir: BaseDirectory.AppLocalData,
                      });
                      if (!folderExists) {
                        await mkdir(projectFolderName, {
                          recursive: true,
                          baseDir: BaseDirectory.AppLocalData,
                        });
                      }
                      await copyFile(file, `${projectFolderName}/${last}`, {
                        toPathBaseDir: BaseDirectory.AppLocalData,
                      });
                      if (!activeSprite) {
                        return;
                      }
                      await new DatabaseManager().addCostumeToSprite(
                        "isBackdrop" in activeSprite &&
                          (activeSprite.isBackdrop as boolean)
                          ? -activeSprite.id
                          : activeSprite.id,
                        activeSprite.image_paths,
                        last,
                        appDataDir || "",
                        spriteNameDialogValue ||
                          baseNameOf(originalName) ||
                          "New Costume",
                        "isBackdrop" in activeSprite &&
                          (activeSprite.isBackdrop as boolean),
                        projectId,
                      );
                      refreshDataCallback();
                      setSpriteImageDialogValue("");
                      setSpriteNameDialogValue("");
                      setNewCostumeDialogOpen(false);
                    }}
                  >
                    Add {(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardFooter>
      </Card>
      <Card className="h-full flex-6">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>
            Current {(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}
          </CardTitle>
          {activeCostume ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={activeCostume.loadablePath}
                alt={`Current ${(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}`}
                style={{
                  maxWidth: 256,
                  maxHeight: 256,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
                className="border rounded"
              />
              <div className="flex flex-row items-center gap-1">
                <p className="text-sm text-center">
                  {(activeSprite?.id || 1) < 0 ? "Backdrop" : "Costume"}:
                </p>
                <Input
                  key={activeCostume.loadablePath}
                  onBlur={async (e) => {
                    if (isLesson || !activeSprite) {
                      return;
                    }
                    await new DatabaseManager().updateCostumeName(
                      "isBackdrop" in activeSprite &&
                        (activeSprite.isBackdrop as boolean)
                        ? -activeSprite.id
                        : activeSprite.id,
                      activeSprite.image_paths,
                      activeCostume.loadablePath,
                      e.target.value,
                      "isBackdrop" in activeSprite &&
                        (activeSprite.isBackdrop as boolean),
                    );
                    refreshDataCallback();
                    setActiveCostume({
                      ...activeCostume,
                      costumeName: e.target.value,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  className="border rounded px-2 py-1 w-full"
                  disabled={isLesson}
                  defaultValue={activeCostume.costumeName}
                ></Input>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p>
                No {(activeSprite?.id || 1) < 0 ? "backdrop" : "costume"}{" "}
                selected.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
