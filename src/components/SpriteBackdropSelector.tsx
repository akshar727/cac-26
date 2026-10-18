"use client";
import { DatabaseManager } from "@/lib/database";
import { cn } from "@/lib/utils";
import { DatabaseBackdrop, DatabaseSprite } from "@/types/database";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { copyFile, BaseDirectory, mkdir, exists } from "@tauri-apps/plugin-fs";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Card, CardContent, CardTitle, CardFooter } from "./ui/card";
import { DialogContent, DialogFooter } from "./ui/dialog";
import { FieldGroup } from "./ui/field";
import { Label } from "./ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { Skeleton } from "./ui/skeleton";
import {
  CheckIcon,
  CopyIcon,
  DotsThreeIcon,
  NotePencilIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  baseNameOf,
  fileNameFromPath,
  openImage,
  uniqueFileName,
} from "@/lib/utils";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface SpriteSelectorProps {
  sprites: (DatabaseSprite | DatabaseBackdrop)[];
  activeSprite: DatabaseSprite | DatabaseBackdrop | null;
  setActiveSprite: (sprite: DatabaseSprite | DatabaseBackdrop) => void;
  activeSpriteRef: React.MutableRefObject<
    DatabaseSprite | DatabaseBackdrop | null
  >;
  spriteDialogOpen: boolean;
  setSpriteDialogOpen: (open: boolean) => void;
  spriteNameDialogValue: string | null;
  setSpriteNameDialogValue: (val: string) => void;
  spriteImageDialogValue: string | null;
  setSpriteImageDialogValue: (val: string | null) => void;
  appDataDirRef: React.MutableRefObject<string | null>;
  projectId: number | null;
  importDatabaseData: () => Promise<void>;
  isLesson?: boolean;
}

export default function SpriteAndBackdropSelector({
  sprites,
  activeSprite,
  setActiveSprite,
  activeSpriteRef,
  spriteDialogOpen,
  setSpriteDialogOpen,
  spriteNameDialogValue,
  setSpriteNameDialogValue,
  spriteImageDialogValue,
  setSpriteImageDialogValue,
  appDataDirRef,
  projectId,
  importDatabaseData,
  isLesson = false,
}: SpriteSelectorProps) {
  const [renameSprite, setRenameSprite] = useState<DatabaseSprite | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteSprite, setDeleteSprite] = useState<DatabaseSprite | null>(null);

  const spriteItems = sprites.filter(
    (sprite) =>
      typeof sprite === "object" &&
      sprite !== null &&
      !("isBackdrop" in sprite),
  );
  const backdropItems = sprites.filter(
    (sprite) =>
      typeof sprite === "object" &&
      sprite !== null &&
      "isBackdrop" in sprite &&
      sprite.isBackdrop === true,
  );

  const openRenameDialog = (sprite: DatabaseSprite) => {
    setRenameSprite(sprite);
    setRenameValue(sprite.name);
  };

  return (
    <>
      <Card className="flex-2 justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Sprites</CardTitle>
          {spriteItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {spriteItems.map((sprite) => {
                return (
                  <Card
                    className={cn(
                      "hover:cursor-pointer relative hover:bg-muted transition-colors duration-200",
                      activeSprite?.id === sprite.id &&
                        !("isBackdrop" in activeSprite)
                        ? "bg-secondary ring-2 ring-ring"
                        : "",
                    )}
                    onClick={() => {
                      setActiveSprite(sprite);
                      activeSpriteRef.current = sprite;
                    }}
                    key={sprite.id}
                  >
                    {!isLesson && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="absolute top-2 right-2 z-10"
                              aria-label={`Actions for ${sprite.name}`}
                              onClick={(event) => event.stopPropagation()}
                            />
                          }
                        >
                          <DotsThreeIcon weight="bold" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-36 p-1" align="start">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => openRenameDialog(sprite)}
                            >
                              <NotePencilIcon aria-hidden="true" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                await new DatabaseManager().duplicateSprite(
                                  sprite.id,
                                  sprite.project_id,
                                  appDataDirRef.current || "",
                                );
                                await importDatabaseData();
                              }}
                            >
                              <CopyIcon aria-hidden="true" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteSprite(sprite)}
                            >
                              <TrashIcon aria-hidden="true" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {activeSprite?.id === sprite.id &&
                      !("isBackdrop" in activeSprite) && (
                        <CheckIcon
                          aria-hidden="true"
                          className="pointer-events-none absolute left-2 top-2 z-10 size-5 rounded-full bg-ring p-0.5 text-background"
                        />
                      )}
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={
                        activeSprite?.id === sprite.id &&
                        !("isBackdrop" in activeSprite)
                      }
                      aria-label={`Select sprite ${sprite.name}`}
                      className="h-auto w-full whitespace-normal p-0 font-normal hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <CardContent className="flex flex-col items-center gap-2">
                        {sprite.image_paths.length === 0 ? (
                          <Skeleton className="size-16" />
                        ) : (
                          <img
                            src={sprite.image_paths[0].loadablePath}
                            alt=""
                            className="h-auto max-h-16 w-auto max-w-16 object-contain"
                          />
                        )}
                        <p className="text-sm text-center">{sprite.name}</p>
                      </CardContent>
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isLesson
                ? "This lesson has no sprites."
                : "No sprites yet. Add one to start coding."}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col justify-center gap-1">
          {!isLesson && (
            <Dialog
              open={spriteDialogOpen}
              onOpenChange={setSpriteDialogOpen}
              onOpenChangeComplete={(newState) => {
                if (!newState) {
                  setSpriteImageDialogValue("");
                  setSpriteNameDialogValue("");
                }
              }}
            >
              <DialogTrigger
                render={
                  <Button onClick={async () => {}}>
                    <PlusIcon aria-hidden="true" />
                    Add a sprite
                  </Button>
                }
              />
              <DialogContent>
                <DialogTitle>Add a sprite</DialogTitle>
                <DialogDescription>
                  Name your sprite, then choose one or more pictures for it.
                </DialogDescription>
                <FieldGroup>
                  <Field>
                    <Label htmlFor="spriteName">Sprite name</Label>
                    <Input
                      id="spriteName"
                      type="text"
                      autoComplete="off"
                      value={spriteNameDialogValue || ""}
                      onChange={(e) => setSpriteNameDialogValue(e.target.value)}
                      placeholder="For example, Rocket"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="spriteImage">Sprite pictures</Label>
                    <Button
                      id="spriteImage"
                      variant="outline"
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
                              JSON.stringify([selectedFile]),
                            );
                          } else if (Array.isArray(selectedFile)) {
                            setSpriteImageDialogValue(
                              JSON.stringify(selectedFile),
                            );
                          }
                        }
                      }}
                    >
                      Choose pictures
                    </Button>
                    {spriteImageDialogValue && (
                      <p className="text-sm break-all relative">
                        Chosen:{" "}
                        {JSON.parse(spriteImageDialogValue).map(
                          (path: string, index: number) => (
                            <span key={index}>
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto whitespace-normal p-0 text-wrap text-foreground underline decoration-foreground/40 underline-offset-4 hover:bg-transparent hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                onClick={async () => {
                                  await openImage(path);
                                }}
                              >
                                {fileNameFromPath(path)}
                              </Button>
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
                      !spriteImageDialogValue || !spriteNameDialogValue?.trim()
                    }
                    onClick={async () => {
                      if (!spriteImageDialogValue || !spriteNameDialogValue) {
                        return;
                      }
                      const files: string[] = JSON.parse(
                        spriteImageDialogValue,
                      );
                      const savedFiles: {
                        originalName: string;
                        storedName: string;
                      }[] = [];
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
                      let fileIndex = 0;
                      for (const file of files) {
                        const originalName = fileNameFromPath(file);
                        if (!originalName) {
                          return;
                        }
                        const storedName = uniqueFileName(
                          originalName,
                          fileIndex,
                        );
                        fileIndex++;
                        savedFiles.push({ originalName, storedName });
                        await copyFile(
                          file,
                          `proj_${projectId}/${storedName}`,
                          {
                            toPathBaseDir: BaseDirectory.AppLocalData,
                          },
                        );
                      }
                      const baseDir =
                        appDataDirRef.current ?? (await appLocalDataDir());
                      const formattedFileNames = await Promise.all(
                        savedFiles.map(
                          async ({ originalName, storedName }) => ({
                            costumeName: baseNameOf(originalName),
                            loadablePath: convertFileSrc(
                              await join(
                                baseDir,
                                `proj_${projectId}`,
                                storedName,
                              ),
                            ),
                            truePath: `proj_${projectId}/${storedName}`,
                          }),
                        ),
                      );
                      console.log("Project ID:", projectId);
                      await new DatabaseManager().addNewSprite(
                        spriteNameDialogValue.trim(),
                        formattedFileNames,
                        projectId as number,
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
          )}
        </CardFooter>
      </Card>
      <Dialog
        open={renameSprite !== null}
        onOpenChange={(open) => {
          if (!open) setRenameSprite(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename sprite</DialogTitle>
            <DialogDescription>
              Pick a new name for this sprite.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <Label htmlFor="renameSprite">Sprite name</Label>
            <Input
              id="renameSprite"
              autoComplete="off"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              disabled={!renameValue.trim() || !renameSprite}
              onClick={async () => {
                if (!renameSprite || !renameValue.trim()) return;
                await new DatabaseManager().updateSpriteName(
                  renameSprite.id,
                  renameValue.trim(),
                  false,
                );
                await importDatabaseData();
                setRenameSprite(null);
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteSprite !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSprite(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteSprite?.name ?? "this sprite"}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the sprite along with its costumes,
              variables, and code. You cannot undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <DialogClose
              render={
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!deleteSprite) return;
                    await new DatabaseManager().deleteSprite(deleteSprite.id);
                    await importDatabaseData();
                    setDeleteSprite(null);
                  }}
                >
                  Delete sprite
                </Button>
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="flex-1 justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Backdrops</CardTitle>
          {backdropItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {backdropItems.map((sprite) => {
                return (
                  <Card
                    className={cn(
                      "hover:cursor-pointer relative hover:bg-muted transition-colors duration-200",
                      activeSprite?.id === sprite.id &&
                        "isBackdrop" in activeSprite &&
                        activeSprite.isBackdrop === true
                        ? "bg-secondary ring-2 ring-ring"
                        : "",
                    )}
                    onClick={() => {
                      setActiveSprite(sprite);
                      activeSpriteRef.current = sprite;
                    }}
                    key={sprite.id}
                  >
                    {activeSprite?.id === sprite.id &&
                      "isBackdrop" in activeSprite &&
                      activeSprite.isBackdrop === true && (
                        <CheckIcon
                          aria-hidden="true"
                          className="pointer-events-none absolute left-2 top-2 z-10 size-5 rounded-full bg-ring p-0.5 text-background"
                        />
                      )}
                    <Button
                      type="button"
                      variant="ghost"
                      aria-pressed={
                        activeSprite?.id === sprite.id &&
                        "isBackdrop" in activeSprite &&
                        activeSprite.isBackdrop === true
                      }
                      aria-label={`Select backdrop ${sprite.name}`}
                      className="h-auto w-full whitespace-normal p-0 font-normal hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <CardContent className="flex flex-col items-center gap-2">
                        {sprite.image_paths.length === 0 ? (
                          <Skeleton className="size-16" />
                        ) : (
                          <img
                            src={sprite.image_paths[0].loadablePath}
                            alt=""
                            className="h-auto max-h-16 w-auto max-w-16 object-contain"
                          />
                        )}
                        <p className="text-sm text-center">{sprite.name}</p>
                      </CardContent>
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No backdrops yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
