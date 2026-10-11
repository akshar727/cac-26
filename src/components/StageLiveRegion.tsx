import * as React from "react";
import type { Runtime } from "@/runner/runtime";
import { spriteLabel, variableLabel, type StageSprites } from "@/lib/stage";

export function StageLiveRegion({
  runtimeRef,
  sprites,
  active,
}: {
  runtimeRef: React.MutableRefObject<Runtime | null>;
  sprites: StageSprites;
  active: boolean;
}) {
  const [message, setMessage] = React.useState("");
  const spritesRef = React.useRef(sprites);
  const wasActive = React.useRef(false);
  const lastSpeech = React.useRef(new Map<number, string>());
  const lastValues = React.useRef(new Map<string, string>());

  React.useEffect(() => {
    spritesRef.current = sprites;
  }, [sprites]);

  React.useEffect(() => {
    if (!active) {
      if (wasActive.current) {
        wasActive.current = false;
        setMessage("Code stopped.");
      }
      return;
    }
    wasActive.current = true;
    lastSpeech.current = new Map();
    lastValues.current = new Map();
    setMessage("Code is running.");
    const timer = window.setInterval(() => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const parts = new Set<string>();
      for (const target of runtime._targets) {
        const speech = target.sayText || target.thinkText;
        const previous = lastSpeech.current.get(target.id) ?? "";
        if (speech !== previous) {
          lastSpeech.current.set(target.id, speech);
          if (speech) {
            const verb = target.sayText ? "says" : "thinks";
            parts.add(
              `${spriteLabel(target, spritesRef.current)} ${verb} ${speech}.`,
            );
          }
        }
        for (const [id, value] of target.variables) {
          const key = `${target.id}:${id}`;
          const text = String(value);
          const before = lastValues.current.get(key);
          lastValues.current.set(key, text);
          if (before !== undefined && before !== text) {
            parts.add(`${variableLabel(id, spritesRef.current)} is now ${text}.`);
          }
        }
      }
      if (parts.size > 0) setMessage(Array.from(parts).slice(-3).join(" "));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, runtimeRef]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
