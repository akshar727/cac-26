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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { copyFile, BaseDirectory, mkdir, exists } from "@tauri-apps/plugin-fs";
import { Field } from "@/components/ui/field";
import { DialogContent, DialogFooter } from "./ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { open } from "@tauri-apps/plugin-dialog";
import { Input } from "./ui/input";
import { cn, openImage } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Plus } from "lucide-react";

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
}: {
  activeSprite: DatabaseSprite | null;
  refreshDataCallback: () => Promise<void>;
  appDataDir: string;
  projectId: number;
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

  useEffect(() => {
    console.log("Active sprite changed:", activeSprite);
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
          <CardTitle>Costumes</CardTitle>
          {activeSprite && activeSprite.image_paths.length > 0 ? (
            <ScrollArea>
              <div
                key={JSON.stringify(activeSprite)}
                className="grid grid-cols-1 gap-2 p-1"
              >
                {activeSprite.image_paths.map((imageInfo, index: number) => {
                  return (
                    <Card
                      key={index}
                      onClick={() => {
                        setActiveCostume(imageInfo);
                      }}
                      className={cn(
                        "hover:cursor-pointer hover:bg-slate-100 transition-colors duration-200",
                        activeCostume?.loadablePath === imageInfo.loadablePath
                          ? "bg-slate-100"
                          : "",
                      )}
                    >
                      <CardContent className="flex relative flex-col items-center gap-2">
                        <img
                          src={imageInfo.loadablePath}
                          alt={`Costume ${index + 1}`}
                          style={{
                            maxWidth: 64,
                            maxHeight: 64,
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                          }}
                        />
                        <p className="text-sm text-center">
                          {imageInfo.costumeName}
                        </p>
                        <ImageSpecs loadablePath={imageInfo.loadablePath} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col gap-2">
              <p>No costumes available for this sprite.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
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
                  Add a costume
                </Button>
              }
            />
            <DialogContent>
              <DialogTitle>Add a new costume</DialogTitle>
              <DialogDescription>
                Select an image file to add as a costume for the sprite.
              </DialogDescription>
              <FieldGroup>
                <Field>
                  <Label htmlFor="spriteName">Costume Name</Label>
                  <Input
                    type="text"
                    id="spriteName"
                    value={spriteNameDialogValue}
                    defaultValue={
                      spriteImageDialogValue
                        ? spriteImageDialogValue.split("/").pop()
                        : ""
                    }
                    onChange={(e) => setSpriteNameDialogValue(e.target.value)}
                    placeholder="Enter costume name"
                    className="border rounded px-2 py-1 w-full"
                  />
                </Field>
                <Field>
                  <Label htmlFor="spriteImage">Costume Image</Label>
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
                        {spriteImageDialogValue.split("/").pop()}
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
                    const last = file.split("/").pop();
                    if (!last) {
                      return;
                    }
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
                    console.log("Copied file:", last);
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
                        last.split("/").pop() ||
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
                  Add Costume
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
      <Card className="h-full flex-6">
        <CardContent className="flex flex-col gap-2">
          <CardTitle>Current Costume</CardTitle>
          {activeCostume ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={activeCostume.loadablePath}
                alt={`Current Costume`}
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
                <p className="text-sm text-center">Costume:</p>
                <Input
                  key={activeCostume.loadablePath}
                  onBlur={async (e) => {
                    if (!activeSprite) {
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
                  defaultValue={activeCostume.costumeName}
                ></Input>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    onClick={async () => {
                      await new DatabaseManager().deleteCostume(
                        activeCostume.loadablePath,
                        activeSprite?.image_paths || [],
                        "isBackdrop" in activeSprite &&
                          (activeSprite.isBackdrop as boolean)
                          ? -activeSprite.id
                          : activeSprite.id,
                        "isBackdrop" in activeSprite &&
                          (activeSprite.isBackdrop as boolean),
                      );
                      await refreshDataCallback().then(() => {
                        setActiveCostume(null);
                      });
                    }}
                    variant="destructive"
                    disabled={activeSprite.image_paths.length <= 1}
                  >
                    Delete Costume
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className={
                    activeSprite.image_paths.length <= 1 ? "" : "hidden"
                  }
                >
                  <p>You cannot delete the only costume of a sprite.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p>No costume selected.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
