import { Command } from "@tauri-apps/plugin-shell";
import { type } from "@tauri-apps/plugin-os";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function openImage(path: string) {
  const os = await type();
  if (os === "windows") {
    return await Command.create("open-windows", [path]).execute();
  } else if (os === "linux") {
    return await Command.create("open-linux", [path]).execute();
  } else if (os === "macos") {
    return await Command.create("open-macos", [
      "-a",
      "Preview",
      path,
    ]).execute();
  }
}
