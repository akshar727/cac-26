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
import { Copy, MoreHorizontal, PlusIcon, SquarePen, Trash } from "lucide-react";
import { openImage } from "@/lib/utils";
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

  const openRenameDialog = (sprite: DatabaseSprite) => {
    setRenameSprite(sprite);
    setRenameValue(sprite.name);
  };

  return (
    <>
      <Card className="flex-2 justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Sprites</CardTitle>
          {sprites.filter(
            (sprite) =>
              typeof sprite === "object" &&
              sprite !== null &&
              !("isBackdrop" in sprite),
          ).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sprites
                .filter(
                  (sprite) =>
                    typeof sprite === "object" &&
                    sprite !== null &&
                    !("isBackdrop" in sprite),
                )
                .map((sprite) => {
                  return (
                    <Card
                      className={cn(
                        "hover:cursor-pointer relative hover:bg-slate-100 transition-colors duration-200",
                        activeSprite?.id === sprite.id &&
                          !("isBackdrop" in activeSprite)
                          ? "bg-slate-100"
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
                                className="absolute hover:bg-gray-200 top-2 right-2 z-10"
                                aria-label={`Actions for ${sprite.name}`}
                                onClick={(event) => event.stopPropagation()}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-36 p-1"
                            align="start"
                          >
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => openRenameDialog(sprite)}
                              >
                                <SquarePen />
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
                                <Copy />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteSprite(sprite)}
                              >
                                <Trash />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
        <CardFooter className="flex bg-white flex-col gap-1 justify-center">
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
                    <PlusIcon />
                    Add a sprite
                  </Button>
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
                      <p className="text-sm break-all relative">
                        Selected image(s):{" "}
                        {JSON.parse(spriteImageDialogValue).map(
                          (path: string, index: number) => (
                            <span key={index}>
                              <span
                                className=" text-blue-500 hover:cursor-pointer hover:underline text-wrap"
                                onClick={async () => {
                                  await openImage(path);
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
                      for (const file of files) {
                        const last = file.split("/").pop();
                        if (!last) {
                          return;
                        }
                        fileNames.push(last);
                        await copyFile(file, `proj_${projectId}/${last}`, {
                          toPathBaseDir: BaseDirectory.AppLocalData,
                        });
                      }
                      console.log("Copied files:", fileNames);
                      let formattedFileNames = fileNames.map((name) => ({
                        costumeName: name.split(".")[0],
                        loadablePath: convertFileSrc(
                          `${appDataDirRef.current}/proj_${projectId}/${name}`,
                        ),
                        truePath: `proj_${projectId}/${name}`,
                      }));
                      console.log("Project ID:", projectId);
                      await new DatabaseManager().addNewSprite(
                        spriteNameDialogValue,
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
              Enter a new name for this sprite.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <Label htmlFor="renameSprite">Sprite name</Label>
            <Input
              id="renameSprite"
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
            <DialogTitle>Delete this sprite?</DialogTitle>
          </DialogHeader>
          This is a permanent action and cannot be undone. All costumes,
          variables, and code associated with this sprite will be lost.
          <DialogFooter className="bg-white">
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
                  Delete Sprite
                </Button>
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="flex-1 justify-between">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Backdrops</CardTitle>
          {sprites.filter(
            (sprite) =>
              typeof sprite === "object" &&
              sprite !== null &&
              "isBackdrop" in sprite &&
              sprite.isBackdrop === true,
          ).length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {sprites
                .filter(
                  (sprite) =>
                    typeof sprite === "object" &&
                    sprite !== null &&
                    "isBackdrop" in sprite &&
                    sprite.isBackdrop === true,
                )
                .map((sprite) => {
                  return (
                    <Card
                      className={cn(
                        "hover:cursor-pointer hover:bg-slate-100 transition-colors duration-200",
                        activeSprite?.id === sprite.id &&
                          "isBackdrop" in activeSprite &&
                          activeSprite.isBackdrop === true
                          ? "bg-slate-100"
                          : "",
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
              <p>Backdrops will be displayed here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
