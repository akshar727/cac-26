import React from "react";
import ReactDOM from "react-dom/client";
import "@blockly/field-colour-hsv-sliders";
import "@/components/CustomContinuousFlyout";
import CodeEditor from "./CodeEditor";
import ProjectSelector from "./ProjectSelector";

function AppWrapper() {
  const [projectId, setProjectId] = React.useState<number | null>(null);
  return (
    <React.StrictMode>
      {projectId === null && (
        <ProjectSelector onProjectSelect={(id) => setProjectId(id)} />
      )}
      {projectId !== null && <CodeEditor projectId={projectId} cb={() => setProjectId(null)} />}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWrapper />,
);
