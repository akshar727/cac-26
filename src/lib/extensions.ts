import * as Blockly from "blockly";

export const EXTENSION_NAMES = [
  "costume_dropdown_extension",
  "broadcast_dropdown_extension",
  "touching_dropdown_extension",
  "glide_preset_dropdown_extension",
  "distance_to_dropdown_extension",
] as const;

export function registerExtensions(
  name: string,
  init: (this: Blockly.Block) => void,
): void {
  try {
    Blockly.Extensions.register(name, init);
  } catch {
    try {
      Blockly.Extensions.unregister(name);
      Blockly.Extensions.register(name, init);
    } catch (error) {
      console.error(`Could not register ${name}:`, error);
    }
  }
}

export function unregisterExtensions(): void {
  for (const name of EXTENSION_NAMES) {
    try {
      Blockly.Extensions.unregister(name);
    } catch {}
  }
}
