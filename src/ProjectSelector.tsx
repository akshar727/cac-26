"use client";
import React from "react";
import { DatabaseManager } from "./lib/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";

export default function ProjectSelector({
  onProjectSelect,
}: {
  onProjectSelect: (id: number) => void;
}) {
  const [projects, setProjects] = React.useState<
    { id: number; name: string; description: string }[]
  >([]);
  React.useEffect(() => {
    const fetchProjects = async () => {
      const projects = await new DatabaseManager().getProjects();
      setProjects(projects);
    };
    fetchProjects();
  }, []);
  return (
    <div className="flex flex-col w-full gap-4 items-center h-full mt-1/2 justify-center">
      <div>
        <h1 className="text-2xl font-bold mt-1/2">Welcome to cac</h1>
        <h2 className="text-lg">
          Select a project, or create a new one to get started.
        </h2>
      </div>
      <div className="flex w-full flex-col gap-4 px-4">
        <div className="flex w-full justify-center flex-row flex-wrap gap-4">
          {projects.map((project) => (
            <Card className="w-64" key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center bg-white">
                <Button onClick={() => onProjectSelect(project.id)}>
                  Open Project
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <Dialog>
          <DialogTrigger
            render={<Button>Create New Project</Button>}
          ></DialogTrigger>
          <DialogContent>
            <h1>Create new Project</h1>
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
    </div>
  );
}
