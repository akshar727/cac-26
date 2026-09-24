import React from "react";
import ReactDOM from "react-dom/client";
import "@blockly/field-colour-hsv-sliders";
import "@/components/CustomContinuousFlyout";
import CodeEditor from "./ProjectCodeEditor";
import ProjectSelector from "./ProjectSelector";
import { TooltipProvider } from "@/components/ui/tooltip";
import LessonView from "./LessonView";
import { loadPastelTheme, savePastelTheme } from "./lib/settings";

function AppWrapper() {
  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [lessonId, setLessonId] = React.useState<number | null>(null);
  const [pastelTheme, setPastelTheme] = React.useState(loadPastelTheme);

  const updatePastelTheme = (enabled: boolean) => {
    setPastelTheme(enabled);
    savePastelTheme(enabled);
  };
  return (
    <React.StrictMode>
      <TooltipProvider>
        {projectId === null && lessonId === null && (
          <ProjectSelector
            onProjectSelect={(id) => setProjectId(id)}
            onLessonSelect={(id) => setLessonId(id)}
            pastelTheme={pastelTheme}
            onPastelThemeChange={updatePastelTheme}
          />
        )}
        {projectId !== null && (
          <CodeEditor
            projectId={projectId}
            cb={() => setProjectId(null)}
            pastelTheme={pastelTheme}
          />
        )}
        {lessonId !== null && (
          <LessonView
            lessonId={lessonId}
            cb={() => setLessonId(null)}
            pastelTheme={pastelTheme}
          />
        )}
      </TooltipProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWrapper />,
);
