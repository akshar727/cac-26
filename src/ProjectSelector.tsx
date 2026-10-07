"use client";
import React from "react";
import { DatabaseManager } from "./lib/database";
import { appDataDir, join, resolveResource } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Checkbox } from "./components/ui/checkbox";
import {
  ArrowRight,
  Check,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  TextAlignStart,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "./components/ui/scroll-area";
import { Skeleton } from "./components/ui/skeleton";
import { Lesson } from "./lib/lesson";
import { cn } from "cn";
import { ComfortSettings } from "./lib/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

export default function ProjectSelector({
  onProjectSelect,
  onLessonSelect,
  pastelTheme,
  onPastelThemeChange,
  comfortSettings,
  onComfortSettingsChange,
}: {
  onProjectSelect: (id: number) => void;
  onLessonSelect: (id: number) => void;
  pastelTheme: boolean;
  onPastelThemeChange: (enabled: boolean) => void;
  comfortSettings: ComfortSettings;
  onComfortSettingsChange: (settings: ComfortSettings) => void;
}) {
  const [projects, setProjects] = React.useState<
    { id: number; name: string; description: string }[]
  >([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [projectThumbnails, setProjectThumbnails] = React.useState<
    Record<number, string>
  >({});
  const [projectNameError, setProjectNameError] = React.useState(false);
  const [lessonThumbnails, setLessonThumbnails] = React.useState<
    Record<number, string>
  >({});
  const [renameProject, setRenameProject] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [descriptionProject, setDescriptionProject] = React.useState<{
    id: number;
    description: string;
  } | null>(null);
  const [descriptionValue, setDescriptionValue] = React.useState("");
  const [deleteProject, setDeleteProject] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const refreshProjects = async () => {
    setProjects(await new DatabaseManager().getProjects());
  };

  const openRenameDialog = (project: { id: number; name: string }) => {
    setRenameProject(project);
    setRenameValue(project.name);
  };

  const openDescriptionDialog = (project: {
    id: number;
    description: string;
  }) => {
    setDescriptionProject(project);
    setDescriptionValue(project.description);
  };

  React.useEffect(() => {
    const fetchProjects = async () => {
      const projects = await new DatabaseManager().getProjects();
      setProjects(projects);
    };
    const fetchLessons = async () => {
      const lessons = await new DatabaseManager().getLessons();
      setLessons(lessons);
    };
    fetchProjects();
    fetchLessons();
  }, []);

  React.useEffect(() => {
    console.log("Loading thumbnails for projects and lessons...");
    const loadThumbnails = async () => {
      const appDir = await appDataDir();
      const loadProjectThumbnail = async (folder: string) => {
        const thumbnailPath = await join(appDir, folder, "thumbnail.png");
        return (await exists(thumbnailPath))
          ? convertFileSrc(thumbnailPath) + "?v=" + Date.now()
          : null;
      };

      const loadLessonThumbnail = async (lessonId: number) => {
        const thumbnailpath = await resolveResource(
          `lesson_assets/thumbnails/lesson_${lessonId}.png`,
        );
        return convertFileSrc(thumbnailpath);
      };

      const [projectEntries, lessonEntries] = await Promise.all([
        Promise.all(
          projects.map(
            async (project) =>
              [
                project.id,
                await loadProjectThumbnail(`proj_${project.id}`),
              ] as const,
          ),
        ),
        Promise.all(
          lessons.map(
            async (lesson) =>
              [lesson.id, await loadLessonThumbnail(lesson.id)] as const,
          ),
        ),
      ]);

      setProjectThumbnails(
        Object.fromEntries(
          projectEntries.filter(
            (entry): entry is [number, string] => entry[1] !== null,
          ),
        ),
      );
      setLessonThumbnails(
        Object.fromEntries(
          lessonEntries.filter(
            (entry): entry is [number, string] => entry[1] !== null,
          ),
        ),
      );
    };

    if (projects.length > 0 || lessons.length > 0) {
      loadThumbnails();
    }
  }, [projects, lessons]);
  return (
    <>
      <div className="text-center left-1/2 top-10 -translate-x-1/2 font-bold absolute">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                className="absolute right-0 top-0 translate-x-full"
                aria-label="Open Codely settings"
                title="Open settings"
              >
                Settings
              </Button>
            }
          ></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Codely settings</DialogTitle>
              {/* <DialogDescription>
                Adjust the workspace colors to make coding feel more
                comfortable.
              </DialogDescription> */}
            </DialogHeader>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Color mode</Label>
              <RadioGroup
                value={pastelTheme ? "pastel" : "standard"}
                onValueChange={(value) =>
                  onPastelThemeChange(value === "pastel")
                }
                aria-label="Color mode"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted">
                  <RadioGroupItem value="standard" id="standard-colors" />
                  <span>
                    <span className="block font-medium">Standard colors</span>
                    <span className="block text-sm text-muted-foreground">
                      Use the regular category palette.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted">
                  <RadioGroupItem value="pastel" id="pastel-colors" />
                  <span>
                    <span className="block font-medium">
                      Sensory-Safe / Pastel
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Use softer, lower-saturation colors with comfortable dark
                      text.
                    </span>
                  </span>
                </label>
              </RadioGroup>
              <div className="space-y-2 border-t pt-3">
                <Label className="text-sm font-semibold">Other settings</Label>
                {[
                  [
                    "Large text",
                    comfortSettings.textSize === "large",
                    (value: boolean) =>
                      onComfortSettingsChange({
                        ...comfortSettings,
                        textSize: value ? "large" : "normal",
                      }),
                  ],
                  [
                    "Atkinson Hyperlegible font",
                    comfortSettings.hyperlegible,
                    (value: boolean) =>
                      onComfortSettingsChange({
                        ...comfortSettings,
                        hyperlegible: value,
                      }),
                  ],
                  [
                    "Calm mode",
                    comfortSettings.calmMode,
                    (value: boolean) =>
                      onComfortSettingsChange({
                        ...comfortSettings,
                        calmMode: value,
                      }),
                  ],
                ].map(([label, checked, onChange]) => (
                  <label
                    key={label as string}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <span>
                      <span className="block">{label as string}</span>
                      {label === "Calm mode" && (
                        <span className="mt-1 block max-w-xs text-sm font-normal text-muted-foreground">
                          Uses a gentle checkmark instead of confetti when a
                          lesson is complete.
                        </span>
                      )}
                    </span>
                    <Checkbox
                      checked={checked as boolean}
                      onCheckedChange={(checkedValue) =>
                        (onChange as (value: boolean) => void)(
                          checkedValue === true,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Done
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <h1 className="text-2xl">Welcome to Codely!</h1>
        <h2 className="text-lg">
          Choose an existing project or start a new one to begin. You can also
          open the lessons to learn how to use Codely and build your own
          projects.
        </h2>
      </div>
      <div className="grid mt-32 xs:mt-16 md:mt-0 h-dvh w-full grid-cols-1 pt-48 gap-6 px-6 md:grid-cols-2 md:px-12">
        <div className="flex min-w-0 w-full flex-col items-center gap-4">
          <h2 className="text-xl font-bold">My Projects</h2>
          <ScrollArea className="h-128 w-full rounded-md border">
            <div className="w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 p-4">
              {projects.map((project) => (
                <Card
                  className="relative flex justify-between"
                  key={project.id}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute hover:bg-gray-200 top-2 right-2 z-10"
                          aria-label={`Actions for ${project.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-48 p-1 whitespace-nowrap"
                      align="start"
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => openRenameDialog(project)}
                        >
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDescriptionDialog(project)}
                        >
                          <TextAlignStart />
                          Change description
                        </DropdownMenuItem>
                        {projects.length > 1 && (
                          <DropdownMenuItem
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteProject(project)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-24 border-b w-full overflow-hidden rounded-t-lg bg-muted">
                    {projectThumbnails[project.id] ? (
                      <img
                        src={projectThumbnails[project.id]}
                        alt={`${project.name} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Skeleton className="h-full w-full rounded-none" />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-center bg-white">
                    <Button
                      variant="secondary"
                      onClick={() => onProjectSelect(project.id)}
                    >
                      Open Project
                      <ArrowRight />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <Dialog>
            <DialogTrigger
              render={
                <Button className="w-fit" variant="secondary" size="lg">
                  <Plus />
                  Create New Project
                </Button>
              }
            ></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Label htmlFor="project-name">
                <div>
                  Project Name <span className="text-destructive">*</span>
                </div>
              </Label>
              <div>
                <Input
                  onChange={(e) => {
                    if (e.target.value.length > 0) setProjectNameError(false);
                    else if (e.target.value.length === 0)
                      setProjectNameError(true);
                  }}
                  defaultValue={"New Project"}
                  id="project-name"
                  placeholder="Enter project name"
                />
                <p
                  className={cn(
                    projectNameError ? "mt-1 text-destructive" : "hidden",
                  )}
                >
                  This field is required.
                </p>
              </div>
              <Label htmlFor="project-description">Project Description</Label>
              <Input
                id="project-description"
                placeholder="Enter project description"
              />
              <Button
                onClick={() => {
                  (async () => {
                    const nameInput = document.getElementById(
                      "project-name",
                    ) as HTMLInputElement;
                    const descriptionInput = document.getElementById(
                      "project-description",
                    ) as HTMLInputElement;
                    const name = nameInput.value;
                    const description = descriptionInput.value;
                    if (!name) {
                      setProjectNameError(true);
                      return;
                    }
                    const dbManager = new DatabaseManager();
                    await dbManager.createProject(name, description);
                    const projects = await dbManager.getProjects();
                    const newProjectId = projects[projects.length - 1].id;
                    onProjectSelect(newProjectId);
                  })();
                }}
              >
                Create Project
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex min-w-0 w-full flex-col items-center gap-4">
          <h2 className="text-xl font-bold">Lessons</h2>
          <ScrollArea className="h-128 w-full rounded-md border">
            <div className="w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 p-4">
              {lessons.map((project) => (
                <Card
                  className="relative flex justify-between"
                  key={project.id}
                >
                  <div className="h-24 border-b w-full overflow-hidden rounded-t-lg bg-muted">
                    {lessonThumbnails[project.id] ? (
                      <img
                        src={lessonThumbnails[project.id]}
                        alt={`${project.name} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Skeleton className="h-full w-full rounded-none" />
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {Number(
                        window.localStorage.getItem(
                          `codely-lesson-progress-${project.id}`,
                        ) ?? 0,
                      ) >= project.successMetrics.length && (
                        <Check
                          className="size-5 text-emerald-600"
                          aria-label="Completed"
                        />
                      )}
                      {project.name}
                    </CardTitle>
                    <CardDescription>
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    Difficulty:{" "}
                    <span
                      className={cn("font-bold", {
                        "text-green-500": project.difficulty === "beginner",
                        "text-yellow-500":
                          project.difficulty === "intermediate",
                        "text-red-500": project.difficulty === "advanced",
                      })}
                    >
                      {project.difficulty.charAt(0).toUpperCase() +
                        project.difficulty.slice(1)}
                    </span>
                  </CardContent>
                  <CardFooter className="flex justify-center bg-white">
                    <Button onClick={() => onLessonSelect(project.id)}>
                      Start Lesson
                      <ArrowRight />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Dialog
        open={renameProject !== null}
        onOpenChange={(open) => {
          if (!open) setRenameProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Label htmlFor="rename-project">Project Name</Label>
          <Input
            id="rename-project"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              disabled={!renameValue.trim() || !renameProject}
              onClick={async () => {
                if (!renameProject || !renameValue.trim()) return;
                await new DatabaseManager().updateProjectName(
                  renameProject.id,
                  renameValue.trim(),
                );
                await refreshProjects();
                setRenameProject(null);
              }}
            >
              Rename Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={descriptionProject !== null}
        onOpenChange={(open) => {
          if (!open) setDescriptionProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change project description</DialogTitle>
          </DialogHeader>
          <Label htmlFor="project-description-edit">Project Description</Label>
          <Input
            id="project-description-edit"
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            autoFocus
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              onClick={async () => {
                if (!descriptionProject) return;
                await new DatabaseManager().updateProjectDescription(
                  descriptionProject.id,
                  descriptionValue,
                );
                await refreshProjects();
                setDescriptionProject(null);
              }}
            >
              Save Description
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteProject !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
          </DialogHeader>
          This is a permanent action and cannot be undone. All sprites,
          backdrops, and other data associated with this project will be lost.
          <DialogFooter className="bg-white">
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <DialogClose
              render={
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!deleteProject) return;
                    await new DatabaseManager().deleteProject(deleteProject.id);
                    await refreshProjects();
                    setDeleteProject(null);
                  }}
                >
                  Delete Project
                </Button>
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
