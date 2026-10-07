import { convertFileSrc } from "@tauri-apps/api/core";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? "";
}


export function baseNameOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}


export function uniqueFileName(fileName: string, index = 0): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = dot > 0 ? fileName.slice(dot) : "";
  const stamp = `${Date.now().toString(36)}${index}`;
  return `${base}-${stamp}${extension}`;
}


export async function openImage(path: string): Promise<void> {
  const previous = document.getElementById("codely-image-preview");
  previous?.remove();

  const previouslyFocused = document.activeElement as HTMLElement | null;

  const overlay = document.createElement("div");
  overlay.id = "codely-image-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Image preview");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:12px;padding:24px;" +
    "background:rgba(15,23,42,0.75);pointer-events:auto;";

  const image = document.createElement("img");
  image.src = convertFileSrc(path);
  image.alt = fileNameFromPath(path) || "Selected image";
  image.style.cssText =
    "max-width:90vw;max-height:80vh;object-fit:contain;background:#fff;" +
    "border-radius:8px;";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close preview";
  close.style.cssText =
    "padding:8px 16px;border-radius:8px;border:0;background:#fff;color:#0f172a;" +
    "font-size:16px;font-weight:600;cursor:pointer;";

  const finish = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
    previouslyFocused?.focus?.();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      finish();
    }
  };

  close.addEventListener("click", finish);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finish();
  });
  document.addEventListener("keydown", onKeyDown, true);

  overlay.append(image, close);
  document.body.append(overlay);
  close.focus();
}
