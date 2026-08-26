"use client";
import { DatabaseManager } from "@/lib/database";
import { cn } from "@/lib/utils";
import { DatabaseBackdrop, DatabaseSprite } from "@/types/database";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { copyFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Card, CardContent, CardTitle, CardFooter } from "./ui/card";
import { DialogContent, DialogFooter } from "./ui/dialog";
import { FieldGroup } from "./ui/field";
import { Label } from "./ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { Skeleton } from "./ui/skeleton";

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
  backdropDialogOpen: boolean;
  setbackdropDialogOpen: (open: boolean) => void;
  backdropNameDialogValue: string | null;
  setbackdropNameDialogValue: (val: string) => void;
  backdropImageDialogValue: string | null;
  setbackdropImageDialogValue: (val: string | null) => void;
  appDataDirRef: React.MutableRefObject<string | null>;
  importDatabaseData: () => Promise<void>;
}

export default function SpriteSelector({
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
  backdropDialogOpen,
  setbackdropDialogOpen,
  backdropNameDialogValue,
  setbackdropNameDialogValue,
  backdropImageDialogValue,
  setbackdropImageDialogValue,
  appDataDirRef,
  importDatabaseData,
}: SpriteSelectorProps) {
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
                        "hover:cursor-pointer hover:bg-slate-100 transition-colors duration-200",
                        activeSprite?.id === sprite.id &&
                          !("isBackdrop" in activeSprite)
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
              <p>Sprites will be displayed here.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
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
                        `${appDataDirRef.current}/${name}`,
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
