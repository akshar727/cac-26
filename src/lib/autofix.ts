import * as Blockly from "blockly";
import type {
  AttachSlot,
  AutoFix,
  ConnectFix,
  PlaceFix,
  SetFieldFix,
} from "@/lib/hints";

export const MAX_AUTOFIX_STEPS = 1;

export type AutoFixContext = {
  workspace: Blockly.WorkspaceSvg;
  toolboxContents: any[];
  ensureBroadcast: (name: string) => void;
};

function findToolboxBlock(contents: any[], blockType: string): any | null {
  for (const item of contents) {
    if (item.kind === "block" && item.type === blockType) return item;
    if (item.kind === "category") {
      const found = findToolboxBlock(item.contents ?? [], blockType);
      if (found) return found;
    }
  }
  return null;
}

function resolveSlot(workspace: Blockly.WorkspaceSvg, slot: AttachSlot) {
  const parent = workspace.getBlockById(slot.parentId);
  if (!parent) return null;
  const connection =
    slot.kind === "next"
      ? parent.nextConnection
      : (parent.getInput(slot.input)?.connection ?? null);
  return connection ? { parent, connection } : null;
}

function tryConnect(
  target: Blockly.Connection,
  own: Blockly.Connection,
): boolean {
  try {
    target.connect(own);
  } catch {
    return false;
  }
  return own.isConnected();
}

function placeBlock(command: PlaceFix, context: AutoFixContext): boolean {
  const { workspace } = context;
  const definition = findToolboxBlock(
    context.toolboxContents,
    command.blockType,
  ) ?? { kind: "block", type: command.blockType };

  if (command.slot.kind === "top") {
    Blockly.serialization.blocks.append(definition, workspace, {
      recordUndo: true,
    });
    workspace.cleanUp();
    return true;
  }

  const target = resolveSlot(workspace, command.slot);
  if (!target || target.connection.isConnected()) return false;
  const created = Blockly.serialization.blocks.append(definition, workspace, {
    recordUndo: true,
  });
  const own = created.outputConnection ?? created.previousConnection;
  if (!own || !tryConnect(target.connection, own)) {
    created.dispose(false);
    return false;
  }
  return true;
}

function connectBlock(command: ConnectFix, context: AutoFixContext): boolean {
  const { workspace } = context;
  const block = workspace.getBlockById(command.blockId);
  const target = resolveSlot(workspace, command.slot);
  if (!block || !target || target.connection.isConnected()) return false;
  const insideBlock = block
    .getDescendants(false)
    .some((descendant) => descendant.id === target.parent.id);
  if (insideBlock) return false;
  const own = block.outputConnection ?? block.previousConnection;
  if (!own || own.isConnected()) return false;
  return tryConnect(target.connection, own);
}

function setField(command: SetFieldFix, context: AutoFixContext): boolean {
  const { workspace } = context;
  const block = workspace.getBlockById(command.blockId);
  const field = block?.getField(command.field);
  if (!field) return false;
  let value = command.value;
  if (command.field === "VAR") {
    const variable = workspace
      .getVariableMap()
      .getAllVariables()
      .find((candidate) => candidate.getName() === value);
    if (!variable) return false;
    value = variable.getId();
  }
  if (command.field === "BROADCAST") {
    context.ensureBroadcast(value);
    (field as Blockly.FieldDropdown).getOptions(false);
  }
  field.setValue(value);
  return String(field.getValue()) === value;
}

export function applyAutoFix(
  command: AutoFix,
  context: AutoFixContext,
): boolean {
  switch (command.action) {
    case "place":
      return placeBlock(command, context);
    case "connect":
      return connectBlock(command, context);
    case "set-field":
      return setField(command, context);
  }
}
