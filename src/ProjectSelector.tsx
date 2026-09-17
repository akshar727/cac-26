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
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import {
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Plus,
  TextAlignStart,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "./components/ui/scroll-area";
import { Skeleton } from "./components/ui/skeleton";
import { Lesson } from "./lib/lesson";
import { cn } from "cn";
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
}: {
  onProjectSelect: (id: number) => void;
  onLessonSelect: (id: number) => void;
}) {
  const [projects, setProjects] = React.useState<
    { id: number; name: string; description: string }[]
  >([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [projectThumbnails, setProjectThumbnails] = React.useState<
    Record<number, string>
  >({});
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
                        <DropdownMenuItem
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteProject(project)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-24 border-b border-t w-full overflow-hidden rounded-t-lg bg-muted">
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
                    <CardDescription>{project.description}</CardDescription>
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
                <Button className="w-fit" size="lg">
                  <Plus />
                  Create New Project
                </Button>
              }
            ></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" placeholder="Enter project name" />
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
                    if (!name || !description) {
                      alert("Please fill in all fields.");
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
                  <div className="h-24 border-b border-t w-full overflow-hidden rounded-t-lg bg-muted">
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
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
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
                    <Button
                      variant="secondary"
                      onClick={() => onLessonSelect(project.id)}
                    >
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
