import React from "react";
import ReactDOM from "react-dom/client";
import "@blockly/field-colour-hsv-sliders";
import "@/components/CustomContinuousFlyout";
import CodeEditor from "./ProjectCodeEditor";
import ProjectSelector from "./ProjectSelector";
import { TooltipProvider } from "@/components/ui/tooltip";
import LessonView from "./LessonView";
import {
  AccessibilitySettings,
  loadAccessibilitySettings,
  loadPastelTheme,
  saveAccessibilitySettings,
  savePastelTheme,
} from "./lib/settings";
import { DatabaseManager } from "./lib/database";

function AppWrapper() {
  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [lessonId, setLessonId] = React.useState<number | null>(null);
  const [pastelTheme, setPastelTheme] = React.useState(loadPastelTheme);
  const [accessibilitySettings, setAccessibilitySettings] =
    React.useState<AccessibilitySettings>(loadAccessibilitySettings);

  const updatePastelTheme = (enabled: boolean) => {
    setPastelTheme(enabled);
    savePastelTheme(enabled);
  };
  const updateAccessibilitySettings = (settings: AccessibilitySettings) => {
    setAccessibilitySettings(settings);
    saveAccessibilitySettings(settings);
  };
  const goToNextLesson = async (currentLessonId: number) => {
    const lessons = await new DatabaseManager().getLessons();
    const currentIndex = lessons.findIndex(
      (lesson) => lesson.id === currentLessonId,
    );
    const nextLesson =
      currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;
    setLessonId(null);
    if (nextLesson) {
      window.setTimeout(() => setLessonId(nextLesson.id), 0);
    }
  };
  return (
    <React.StrictMode>
      <div
        className={`${accessibilitySettings.textSize === "large" ? "codely-large-text" : ""} ${accessibilitySettings.hyperlegible ? "font-hyperlegible" : ""}`}
      >
        <TooltipProvider>
          {projectId === null && lessonId === null && (
            <ProjectSelector
              onProjectSelect={(id) => setProjectId(id)}
              onLessonSelect={(id) => setLessonId(id)}
              pastelTheme={pastelTheme}
              onPastelThemeChange={updatePastelTheme}
              accessibilitySettings={accessibilitySettings}
              onAccessibilitySettingsChange={updateAccessibilitySettings}
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
              accessibilitySettings={accessibilitySettings}
              onNextLesson={goToNextLesson}
            />
          )}
        </TooltipProvider>
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWrapper />,
);
