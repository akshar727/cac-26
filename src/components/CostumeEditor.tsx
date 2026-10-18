import { useState, useEffect, useId, useRef, type CSSProperties } from "react";
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
import { convertFileSrc } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
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
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CopyIcon,
  CornersOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { UniqueIdentifier } from "@dnd-kit/abstract";

type Costume = DatabaseSprite["image_paths"][number];

const ZOOM_STEPS = [25, 50, 100, 200, 400];

const overlayControl =
  "z-10 size-7 rounded-lg bg-muted/70 transition-colors duration-100 hover:bg-muted";

function stepZoom(current: number | null, direction: 1 | -1): number {
  if (current === null) return direction === 1 ? 100 : 50;
  const index = ZOOM_STEPS.indexOf(current);
  const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction));
  return ZOOM_STEPS[next];
}

function imageTypeOf(costume: Costume): string {
  const source = costume.truePath ?? costume.loadablePath;
  const match = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(source);
  return match ? match[1].toUpperCase() : "Image";
}

function copyNameFor(name: string, existingNames: string[]): string {
  const taken = new Set(existingNames);
  let candidate = `${name} copy`;
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${name} copy ${counter}`;
    counter++;
  }
  return candidate;
}

function useImageDimensions(loadablePath: string) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setDimensions(null);
    if (!loadablePath) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = loadablePath;
    return () => {
      cancelled = true;
    };
  }, [loadablePath]);

  return dimensions;
}

function SortableCostumeCard({
  costume,
  index,
  isActive,
  isLesson,
  canDelete,
  canMoveUp,
  canMoveDown,
  onSelect,
  onDelete,
  onMove,
}: {
  costume: Costume;
  index: number;
  isActive: boolean;
  isLesson: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  onMove: (delta: -1 | 1) => void;
}) {
  const id = costume.loadablePath as UniqueIdentifier;
  const deleteHintId = useId();
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
          "hover:bg-muted transition-colors duration-200 relative",
          isLesson ? "hover:cursor-pointer" : "hover:cursor-grab",
          isActive ? "bg-secondary ring-2 ring-ring" : "",
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
                      className="hover:cursor-pointer absolute top-2 right-2 z-10 rounded-lg hover:bg-destructive/30 focus-visible:outline-2 focus-visible:outline-ring transition-colors duration-100 bg-muted/70 flex items-center justify-center size-7"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <XIcon className="w-4 h-4" aria-hidden="true" />
                    </div>
                  }
                />
              }
            />
          ) : !isLesson ? (
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-disabled="true"
                  aria-label={`Delete costume ${costume.costumeName} (unavailable)`}
                  aria-describedby={deleteHintId}
                  className="absolute top-2 right-2 z-10 bg-muted/70 opacity-60 hover:bg-muted/70 hover:cursor-not-allowed active:translate-y-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <XIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              }
            />
          ) : null}
          {!isLesson && !canDelete && (
            <TooltipContent>
              <p>You cannot delete the only costume of a sprite.</p>
            </TooltipContent>
          )}
        </Tooltip>
        {!isLesson && !canDelete && (
          <span id={deleteHintId} className="sr-only">
            You cannot delete the only costume of a sprite.
          </span>
        )}
        {!isLesson && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={overlayControl}
              disabled={!canMoveUp}
              aria-label={`Move ${costume.costumeName} up`}
              onClick={(event) => {
                event.stopPropagation();
                onMove(-1);
              }}
            >
              <CaretUpIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={overlayControl}
              disabled={!canMoveDown}
              aria-label={`Move ${costume.costumeName} down`}
              onClick={(event) => {
                event.stopPropagation();
                onMove(1);
              }}
            >
              <CaretDownIcon aria-hidden="true" />
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          aria-pressed={isActive}
          aria-label={`Select costume ${costume.costumeName}`}
          className="h-auto w-full whitespace-normal p-0 font-normal hover:cursor-[inherit] hover:bg-transparent dark:hover:bg-transparent"
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
        </Button>
      </Card>
      {!isLesson && canDelete && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this costume?</DialogTitle>
          </DialogHeader>
          This is a permanent action and cannot be undone.
          <DialogFooter className="bg-popover">
            <DialogClose
              render={
                <Button variant="destructive" onClick={onDelete}>
                  Delete costume
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
  const dimensions = useImageDimensions(loadablePath);

  if (!dimensions)
    return <span className="text-xs text-muted-foreground">Loading...</span>;

  return (
    <p className="text-xs text-muted-foreground">
      {dimensions.width} x {dimensions.height}
    </p>
  );
}

function CostumePreview({
  costume,
  position,
  total,
  noun,
  isLesson,
  isBusy,
  onPrevious,
  onNext,
  onRename,
  onDuplicate,
}: {
  costume: Costume;
  position: number;
  total: number;
  noun: "costume" | "backdrop";
  isLesson: boolean;
  isBusy: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onRename: (name: string) => Promise<void>;
  onDuplicate: () => Promise<void>;
}) {
  const [zoom, setZoom] = useState<number | null>(null);
  const nameInputId = useId();
  const dimensions = useImageDimensions(costume.loadablePath);
  const label = noun === "backdrop" ? "Backdrop" : "Costume";

  const imageStyle: CSSProperties =
    zoom !== null && dimensions && dimensions.width > 0
      ? {
          width: (dimensions.width * zoom) / 100,
          height: (dimensions.height * zoom) / 100,
          maxWidth: "none",
          maxHeight: "none",
        }
      : {
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={total < 2}
            onClick={onPrevious}
          >
            <CaretLeftIcon aria-hidden="true" />
            Previous
          </Button>
          <span className="min-w-28 text-center text-sm" aria-live="polite">
            {label} {position} of {total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={total < 2}
            onClick={onNext}
          >
            Next
            <CaretRightIcon aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={zoom === ZOOM_STEPS[0]}
            onClick={() => setZoom(stepZoom(zoom, -1))}
          >
            <MagnifyingGlassMinusIcon aria-hidden="true" />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">
            {zoom === null ? "Fit" : `${zoom}%`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            onClick={() => setZoom(stepZoom(zoom, 1))}
          >
            <MagnifyingGlassPlusIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant={zoom === null ? "default" : "outline"}
            size="sm"
            aria-pressed={zoom === null}
            onClick={() => setZoom(null)}
          >
            <CornersOutIcon aria-hidden="true" />
            Fit
          </Button>
        </div>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label={`${label} preview`}
        className="flex h-64 overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage:
            "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%), linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 8px 8px",
        }}
      >
        <img
          src={costume.loadablePath}
          alt={costume.costumeName}
          draggable={false}
          className="m-auto shrink-0"
          style={imageStyle}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="text-sm text-muted-foreground">
          {imageTypeOf(costume)}
          {dimensions ? ` · ${dimensions.width} x ${dimensions.height}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={nameInputId} className="text-sm">
          {label}:
        </Label>
        <Input
          id={nameInputId}
          key={costume.loadablePath}
          onBlur={(e) => {
            if (isLesson) return;
            const value = e.target.value.trim();
            if (!value) {
              e.target.value = costume.costumeName;
              return;
            }
            if (value === costume.costumeName) return;
            void onRename(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          onFocus={(e) => {
            e.target.select();
          }}
          className="min-w-0 flex-1"
          disabled={isLesson}
          defaultValue={costume.costumeName}
        />
        {!isLesson && (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || !costume.truePath}
            onClick={() => void onDuplicate()}
          >
            <CopyIcon aria-hidden="true" />
            Duplicate
          </Button>
        )}
      </div>
      {!isLesson && !costume.truePath && (
        <p className="text-xs text-muted-foreground">
          This starter {noun} cannot be copied. Add your own image to make
          copies.
        </p>
      )}
    </div>
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
  const [activeCostume, setActiveCostume] = useState<Costume | null>(
    activeSprite && activeSprite.image_paths.length > 0
      ? activeSprite.image_paths[0]
      : null,
  );
  const pendingSelectionRef = useRef<string | null>(null);

  const [newCostumeDialogOpen, setNewCostumeDialogOpen] = useState(false);
  const [spriteImageDialogValue, setSpriteImageDialogValue] = useState("");
  const [spriteNameDialogValue, setSpriteNameDialogValue] = useState("");
  const [costumes, setCostumes] = useState<Costume[]>(
    activeSprite?.image_paths ?? [],
  );
  const [announcement, setAnnouncement] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    setCostumes(activeSprite?.image_paths ?? []);
    if (!activeSprite) return;
    const paths = activeSprite.image_paths;
    const wanted = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    setActiveCostume((previous) => {
      if (paths.length === 0) return null;
      const keep = wanted ?? previous?.loadablePath;
      return paths.find((c) => c.loadablePath === keep) ?? paths[0];
    });
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

  const isBackdrop =
    "isBackdrop" in activeSprite && Boolean(activeSprite.isBackdrop);
  const spriteDbId = isBackdrop ? -activeSprite.id : activeSprite.id;
  const noun = activeSprite.id < 0 ? "backdrop" : "costume";
  const activeIndex = costumes.findIndex(
    (c) => c.loadablePath === activeCostume?.loadablePath,
  );

  const reorderCostumes = async (sourceIndex: number, targetIndex: number) => {
    const nextCostumes = [...costumes];
    const [movedCostume] = nextCostumes.splice(sourceIndex, 1);
    nextCostumes.splice(targetIndex, 0, movedCostume);
    setCostumes(nextCostumes);
    setAnnouncement(
      `Moved ${movedCostume.costumeName} to position ${targetIndex + 1} of ${nextCostumes.length}.`,
    );
    await new DatabaseManager().updateCostumeOrder(
      spriteDbId,
      nextCostumes,
      isBackdrop,
    );
    await refreshDataCallback();
  };

  const selectNeighbor = (delta: -1 | 1) => {
    if (costumes.length < 2) return;
    const next =
      activeIndex < 0
        ? 0
        : (activeIndex + delta + costumes.length) % costumes.length;
    setActiveCostume(costumes[next]);
  };

  const renameActiveCostume = async (name: string) => {
    if (isLesson || !activeCostume) return;
    await new DatabaseManager().updateCostumeName(
      spriteDbId,
      activeSprite.image_paths,
      activeCostume.loadablePath,
      name,
      isBackdrop,
    );
    setActiveCostume({ ...activeCostume, costumeName: name });
    await refreshDataCallback();
  };

  const duplicateActiveCostume = async () => {
    if (isLesson || !activeCostume?.truePath || isDuplicating) return;
    setIsDuplicating(true);
    try {
      const projectFolderName = `proj_${projectId}`;
      const copyFileName = uniqueFileName(
        fileNameFromPath(activeCostume.truePath),
      );
      const copyPath = `${projectFolderName}/${copyFileName}`;
      await copyFile(activeCostume.truePath, copyPath, {
        fromPathBaseDir: BaseDirectory.AppLocalData,
        toPathBaseDir: BaseDirectory.AppLocalData,
      });
      const baseDir = appDataDir || (await appLocalDataDir());
      const copy: Costume = {
        costumeName: copyNameFor(
          activeCostume.costumeName,
          costumes.map((c) => c.costumeName),
        ),
        loadablePath: convertFileSrc(await join(baseDir, copyPath)),
        truePath: copyPath,
      };
      const nextCostumes = [...costumes];
      nextCostumes.splice(
        activeIndex < 0 ? nextCostumes.length : activeIndex + 1,
        0,
        copy,
      );
      await new DatabaseManager().updateCostumeOrder(
        spriteDbId,
        nextCostumes,
        isBackdrop,
      );
      pendingSelectionRef.current = copy.loadablePath;
      setAnnouncement(
        `Duplicated ${activeCostume.costumeName}. There are now ${nextCostumes.length} ${noun}s.`,
      );
      await refreshDataCallback();
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <Card className="h-full flex-1 min-w-40 flex justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>
            {noun === "backdrop" ? "Backdrops" : "Costumes"}
          </CardTitle>
          <div className="sr-only" role="status" aria-live="polite">
            {announcement}
          </div>
          {activeSprite.image_paths.length > 0 ? (
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
                await reorderCostumes(sourceIndex, targetIndex);
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
                      canMoveUp={index > 0}
                      canMoveDown={index < costumes.length - 1}
                      onMove={(delta) =>
                        void reorderCostumes(index, index + delta)
                      }
                      onSelect={() => setActiveCostume(costume)}
                      onDelete={async () => {
                        if (
                          activeCostume?.loadablePath === costume.loadablePath
                        ) {
                          pendingSelectionRef.current =
                            (costumes[index + 1] ?? costumes[index - 1])
                              ?.loadablePath ?? null;
                        }
                        await new DatabaseManager().deleteCostume(
                          costume.loadablePath,
                          costumes,
                          spriteDbId,
                          isBackdrop,
                        );
                        await refreshDataCallback();
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </DragDropProvider>
          ) : (
            <div className="flex flex-col gap-2">
              <p>No {noun}s yet.</p>
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
                    <PlusIcon aria-hidden="true" />
                    Add a {noun}
                  </Button>
                }
              />
              <DialogContent>
                <DialogTitle>Add a new {noun}</DialogTitle>
                <DialogDescription>
                  Select an image file to add as a {noun} for the sprite.
                </DialogDescription>
                <FieldGroup>
                  <Field>
                    <Label htmlFor="spriteName">
                      {noun === "backdrop" ? "Backdrop" : "Costume"} name
                    </Label>
                    <Input
                      type="text"
                      id="spriteName"
                      value={spriteNameDialogValue}
                      onChange={(e) => setSpriteNameDialogValue(e.target.value)}
                      placeholder={`Enter ${noun} name`}
                      className="w-full"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="spriteImage">
                      {noun === "backdrop" ? "Backdrop" : "Costume"} image
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
                      Upload image
                    </Button>
                    {spriteImageDialogValue && (
                      <p className="text-sm">
                        Selected image:{" "}
                        <Button
                          variant="link"
                          className="p-0 text-foreground underline hover:cursor-pointer hover:text-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          onClick={async () => {
                            const path = spriteImageDialogValue;
                            await openImage(path);
                          }}
                        >
                          {fileNameFromPath(spriteImageDialogValue)}
                        </Button>
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
                      await new DatabaseManager().addCostumeToSprite(
                        spriteDbId,
                        activeSprite.image_paths,
                        last,
                        appDataDir || "",
                        spriteNameDialogValue ||
                          baseNameOf(originalName) ||
                          "New Costume",
                        isBackdrop,
                        projectId,
                      );
                      refreshDataCallback();
                      setSpriteImageDialogValue("");
                      setSpriteNameDialogValue("");
                      setNewCostumeDialogOpen(false);
                    }}
                  >
                    Add {noun}
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
            Current {noun === "backdrop" ? "Backdrop" : "Costume"}
          </CardTitle>
          {activeCostume ? (
            <CostumePreview
              costume={activeCostume}
              position={activeIndex + 1}
              total={costumes.length}
              noun={noun}
              isLesson={isLesson}
              isBusy={isDuplicating}
              onPrevious={() => selectNeighbor(-1)}
              onNext={() => selectNeighbor(1)}
              onRename={renameActiveCostume}
              onDuplicate={duplicateActiveCostume}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p>No {noun} selected.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
