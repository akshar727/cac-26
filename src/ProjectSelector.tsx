"use client";
import React from "react";
import { DatabaseManager } from "./lib/database";
import {
  Card,
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
import { X } from "lucide-react";
import { ScrollArea } from "./components/ui/scroll-area";
import { Lesson } from "./types/lesson";

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
                  {projects.length > 1 && (
                    <Dialog>
                      <DialogTrigger
                        nativeButton={false}
                        render={
                          <div className="absolute hover:cursor-pointer rounded-lg hover:bg-red-500/40 transition-colors duration-100 bg-gray-200/30 top-0 right-0 flex justify-end m-2 p-1">
                            <X className="w-4 h-4"></X>
                          </div>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete this project?</DialogTitle>
                        </DialogHeader>
                        This is a permanent action and cannot be undone. All
                        sprites, backdrops, and other data associated with this
                        project will be lost.
                        <DialogFooter className="bg-white">
                          <DialogClose
                            render={
                              <Button
                                variant="destructive"
                                onClick={async () => {
                                  const dbManager = new DatabaseManager();
                                  await dbManager.deleteProject(project.id);
                                  setProjects(await dbManager.getProjects());
                                }}
                              >
                                Delete Project
                              </Button>
                            }
                          />
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-center bg-white">
                    <Button
                      variant="secondary"
                      onClick={() => onLessonSelect(project.id)}
                    >
                      Open Lesson
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
