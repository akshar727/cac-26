import type * as Blockly from "blockly";
import type { BlockHelp } from "@/blocks/blockHelp";
import type { Lesson } from "@/lib/lesson";
import type { DatabaseBackdrop, DatabaseSprite } from "@/types/database";

type BlockState = Blockly.serialization.blocks.State;
type ConnectionState = Blockly.serialization.blocks.ConnectionState;
type SpriteOrBackdrop = DatabaseSprite | DatabaseBackdrop;
type LessonMetric = Lesson["successMetrics"][number];
type BlockTitles = Record<string, Pick<BlockHelp, "title">>;

export type ExpectedNode = {
  check?: "exists";
  blockType: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, ExpectedNode | ExpectedNode[]>;
  next?: ExpectedNode | ExpectedNode[];
  spriteId?: number;
};

export type AttachSlot =
  | { kind: "next"; parentId: string }
  | { kind: "input"; parentId: string; input: string };

export type Slot = { kind: "top" } | AttachSlot;

type ProblemBody =
  | { kind: "missing-block"; blockType: string; slot: Slot }
  | { kind: "detached"; blockType: string; blockId: string; slot: AttachSlot }
  | { kind: "wrong-block"; expected: string; found: string; blockId: string }
  | { kind: "empty-input"; blockType: string; parentId: string; input: string }
  | {
      kind: "wrong-value";
      blockType: string;
      blockId: string;
      field: string;
      expected: unknown;
      found: unknown;
    };

export type Problem = ProblemBody & { spriteId?: number };

type Result = { matched: number; problem?: ProblemBody };
type VarResolver = (variableId: string) => string | undefined;

export const fieldDisplayNames: Record<string, string> = {
  X: "x position",
  Y: "y position",
  DX: "x change",
  DY: "y change",
  DURATION: "duration",
  DEGREES: "degrees",
  SIZE_CHANGE: "size change",
  SIZE_SET: "size",
  KEY: "key",
  COSTUME: "costume",
  BROADCAST: "broadcast message",
  DO: "loop body",
  TOUCHING: "thing to touch",
  GLIDE_PRESET: "destination",
  DISTANCE_TO: "destination",
  MESSAGE: "message",
  OP: "operation",
  NUMBER: "number",
  DECIMALS: "decimal places",
  VAR: "variable",
  NUM: "number",
  TEXT: "text",
};

export const valueDisplayNames: Record<string, string> = {
  NONE: "none",
  none: "none",
  SPACE: "space",
  ARROWUP: "up arrow",
  ARROWDOWN: "down arrow",
  ARROWLEFT: "left arrow",
  ARROWRIGHT: "right arrow",
  MOUSE_POINTER: "mouse pointer",
  EDGE: "edge",
  ROUND: "round",
  ROUNDUP: "round up",
  ROUNDDOWN: "round down",
  ADD: "add",
  MINUS: "subtract",
  MULTIPLY: "multiply",
  DIVIDE: "divide",
  POWER: "power",
  NEG: "negative",
  ABS: "absolute value",
  ROOT: "square root",
  LN: "natural log",
  LOG10: "log base 10",
  EXP: "e raised to",
  POW10: "10 raised to",
  SIN: "sine",
  COS: "cosine",
  TAN: "tangent",
  ASIN: "inverse sine",
  ACOS: "inverse cosine",
  ATAN: "inverse tangent",
  PI: "pi",
  E: "Euler's number",
  GOLDEN_RATIO: "golden ratio",
  SQRT2: "square root of 2",
  SQRT1_2: "one-half square root",
  INFINITY: "infinity",
  EQ: "equal to",
  NEQ: "not equal to",
  LT: "less than",
  LTE: "less than or equal to",
  GT: "greater than",
  GTE: "greater than or equal to",
  AND: "and",
  OR: "or",
};

function displayFieldName(field: string): string {
  //@ts-ignore
  return fieldDisplayNames[field] ?? field.toLowerCase().replaceAll("_", " ");
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return "empty";
  if (typeof value === "object" && "name" in value) {
    return String((value as { name: unknown }).name);
  }
  const raw = String(value);
  //@ts-ignore
  return valueDisplayNames[raw] ?? raw.toLowerCase().replaceAll("_", " ");
}

export function makeVarResolver(sprites: SpriteOrBackdrop[]): VarResolver {
  const variables = sprites.flatMap((sprite) => sprite.variables_map);
  return (variableId) =>
    variables.find((variable) => variable.id === variableId)?.name;
}

function fieldValue(
  fieldName: string,
  raw: unknown,
  resolveVar?: VarResolver,
): unknown {
  if (raw && typeof raw === "object" && "id" in raw) {
    const ref = raw as { id: string; name?: string };
    return resolveVar?.(ref.id) ?? ref.name ?? ref.id;
  }
  if (fieldName === "VAR" && typeof raw === "string") {
    return resolveVar?.(raw) ?? raw;
  }
  return raw;
}

const idOf = (node: BlockState): string => node.id ?? "";

function diagnose(
  node: BlockState | undefined,
  expected: ExpectedNode | ExpectedNode[],
  slot: Slot,
  resolveVar?: VarResolver,
): Result {
  if (Array.isArray(expected)) {
    let best: Result = { matched: 0 };
    for (const alternative of expected) {
      const result = diagnose(node, alternative, slot, resolveVar);
      if (!result.problem) return result;
      if (!best.problem || result.matched > best.matched) best = result;
    }
    return best;
  }

  if (!node) {
    return {
      matched: 0,
      problem: { kind: "missing-block", blockType: expected.blockType, slot },
    };
  }
  if (node.type !== expected.blockType) {
    return {
      matched: 0,
      problem: {
        kind: "wrong-block",
        expected: expected.blockType,
        found: node.type,
        blockId: idOf(node),
      },
    };
  }

  let matched = 1;

  for (const [fieldName, want] of Object.entries(expected.fields ?? {})) {
    const got = fieldValue(fieldName, node.fields?.[fieldName], resolveVar);
    if (String(got) !== String(want)) {
      return {
        matched,
        problem: {
          kind: "wrong-value",
          blockType: node.type,
          blockId: idOf(node),
          field: fieldName,
          expected: want,
          found: got,
        },
      };
    }
    matched++;
  }

  for (const [inputName, sub] of Object.entries(expected.inputs ?? {})) {
    const connection: ConnectionState | undefined = node.inputs?.[inputName];
    const child = connection?.block ?? connection?.shadow;
    if (!child) {
      const first = Array.isArray(sub) ? sub[0] : sub;
      return {
        matched,
        problem: {
          kind: "empty-input",
          blockType: first.blockType,
          parentId: idOf(node),
          input: inputName,
        },
      };
    }
    const result = diagnose(
      child,
      sub,
      { kind: "input", parentId: idOf(node), input: inputName },
      resolveVar,
    );
    matched += result.matched;
    if (result.problem) return { matched, problem: result.problem };
  }

  if (expected.next) {
    const result = diagnose(
      node.next?.block,
      expected.next,
      { kind: "next", parentId: idOf(node) },
      resolveVar,
    );
    matched += result.matched;
    if (result.problem) return { matched, problem: result.problem };
  }

  return { matched };
}

function flatten(blocks: BlockState[]): BlockState[] {
  const out: BlockState[] = [];
  const visit = (block?: BlockState) => {
    if (!block) return;
    out.push(block);
    for (const slot of Object.values(block.inputs ?? {})) {
      visit(slot.block);
      visit(slot.shadow);
    }
    visit(block.next?.block);
  };
  blocks.forEach(visit);
  return out;
}

function attachSlotOf(
  problem: Extract<ProblemBody, { kind: "missing-block" | "empty-input" }>,
): AttachSlot | null {
  if (problem.kind === "empty-input") {
    return { kind: "input", parentId: problem.parentId, input: problem.input };
  }
  return problem.slot.kind === "top" ? null : problem.slot;
}

function findFreeBlock(
  topBlocks: BlockState[],
  blockType: string,
  parentId: string,
): BlockState | undefined {
  const parentRoot = topBlocks.find((top) =>
    flatten([top]).some((block) => block.id === parentId),
  );
  const candidates = topBlocks.filter(
    (top) => top.type === blockType && top !== parentRoot,
  );
  if (candidates.length <= 1 || !parentRoot) return candidates[0];
  const distance = (block: BlockState) =>
    Math.abs((block.x ?? 0) - (parentRoot.x ?? 0)) +
    Math.abs((block.y ?? 0) - (parentRoot.y ?? 0));
  return candidates.reduce((closest, candidate) =>
    distance(candidate) < distance(closest) ? candidate : closest,
  );
}

export function diagnoseStep(
  topBlocks: BlockState[],
  expected: ExpectedNode | ExpectedNode[],
  resolveVar?: VarResolver,
): Problem | null {
  let best: Result | undefined;
  for (const top of topBlocks) {
    const result = diagnose(top, expected, { kind: "top" }, resolveVar);
    if (!result.problem) return null;
    if (!best || result.matched > best.matched) best = result;
  }

  const rootType = (Array.isArray(expected) ? expected[0] : expected).blockType;
  const problem: ProblemBody = best?.problem ?? {
    kind: "missing-block",
    blockType: rootType,
    slot: { kind: "top" },
  };

  if (problem.kind === "missing-block" || problem.kind === "empty-input") {
    const slot = attachSlotOf(problem);
    const stray = slot
      ? findFreeBlock(topBlocks, problem.blockType, slot.parentId)
      : undefined;
    if (slot && stray) {
      return {
        kind: "detached",
        blockType: problem.blockType,
        blockId: idOf(stray),
        slot,
      };
    }
  }
  return problem;
}

function isExistsMetric(metric: LessonMetric): metric is ExpectedNode {
  return metric?.check === "exists" && typeof metric.blockType === "string";
}

export function diagnoseLessonStep(
  lesson: Lesson,
  step: number,
  workspaceBlocks: BlockState[],
  sprites: SpriteOrBackdrop[],
): Problem | null {
  const metric: LessonMetric = lesson.successMetrics[step];
  if (!isExistsMetric(metric)) return null;
  const blocks =
    metric.spriteId === undefined
      ? workspaceBlocks
      : ((sprites.find((sprite) => sprite.id === metric.spriteId)
          ?.blocks_json ?? []) as BlockState[]);
  const problem = diagnoseStep(blocks, metric, makeVarResolver(sprites));
  return problem && { ...problem, spriteId: metric.spriteId };
}

export type HintLevel = 1 | 2 | 3;

export type PlaceFix = { action: "place"; blockType: string; slot: Slot };
export type ConnectFix = {
  action: "connect";
  blockId: string;
  slot: AttachSlot;
};
export type SetFieldFix = {
  action: "set-field";
  blockId: string;
  field: string;
  value: string;
};
export type AutoFix = (PlaceFix | ConnectFix | SetFieldFix) & {
  spriteId?: number;
};

export type Hint = {
  text: string;
  highlightBlockIds: string[];
  highlightToolboxTypes: string[];
  autoFix?: AutoFix;
};

export function hintFor(
  problem: Problem,
  level: HintLevel,
  titles: BlockTitles = {},
): Hint {
  const name = (blockType: string) =>
    `'${titles[blockType]?.title ?? blockType}'`;
  const hint: Hint = {
    text: "",
    highlightBlockIds: [],
    highlightToolboxTypes: [],
  };
  const glowBlock = (id?: string) => {
    if (level >= 2 && id) hint.highlightBlockIds = [id];
  };
  const glowToolbox = (blockType: string, override: boolean = false) => {
    if (level >= 2 || override) hint.highlightToolboxTypes = [blockType];
  };
  const offerFix = (fix: PlaceFix | ConnectFix | SetFieldFix) => {
    if (level === 3) hint.autoFix = { ...fix, spriteId: problem.spriteId };
  };

  switch (problem.kind) {
    case "missing-block": {
      const underBlock = problem.slot.kind === "next";
      hint.text =
        level === 1
          ? `You need a ${name(problem.blockType)} block. Look for it in the toolbox.`
          : underBlock
            ? `Add a ${name(problem.blockType)} block under the glowing block. It is glowing in the toolbox.`
            : `Add a ${name(problem.blockType)} block. It is glowing in the toolbox.`;
      glowBlock(
        problem.slot.kind === "top" ? undefined : problem.slot.parentId,
      );
      glowToolbox(problem.blockType, true);
      offerFix({
        action: "place",
        blockType: problem.blockType,
        slot: problem.slot,
      });
      break;
    }
    case "detached":
      hint.text =
        level === 1
          ? `Your ${name(problem.blockType)} block is not connected yet. Is it snapped in?`
          : problem.slot.kind === "next"
            ? `Snap your ${name(problem.blockType)} block under the block above it.`
            : `Snap your ${name(problem.blockType)} block into the empty spot.`;
      glowBlock(problem.blockId);
      offerFix({
        action: "connect",
        blockId: problem.blockId,
        slot: problem.slot,
      });
      break;
    case "wrong-block":
      hint.text =
        level === 1
          ? `Take a look at the ${name(problem.found)} block that's connected. It's not the right one you need.`
          : `Here we need ${name(problem.expected)}, not ${name(problem.found)}.`;
      glowBlock(problem.blockId);
      glowToolbox(problem.expected);
      break;
    case "empty-input":
      hint.text =
        level === 1
          ? `One of your blocks has an empty spot. It needs a ${name(problem.blockType)} block.`
          : `Put a ${name(problem.blockType)} block into the empty slot.`;
      glowBlock(problem.parentId);
      glowToolbox(problem.blockType);
      offerFix({
        action: "place",
        blockType: problem.blockType,
        slot: { kind: "input", parentId: problem.parentId, input: problem.input },
      });
      break;
    case "wrong-value":
      hint.text =
        level === 1
          ? `Check the ${displayFieldName(problem.field)} in your ${name(problem.blockType)} block. It is not quite right yet.`
          : `Change the ${displayFieldName(problem.field)} to ${displayValue(problem.expected)}. It is currently ${displayValue(problem.found)}.`;
      glowBlock(problem.blockId);
      offerFix({
        action: "set-field",
        blockId: problem.blockId,
        field: problem.field,
        value: String(problem.expected),
      });
      break;
  }
  return hint;
}

export type HintState = { level: 0 | HintLevel; signature: string };

export const signatureOf = (problem: Problem | null) =>
  problem ? JSON.stringify(problem) : "";

export function resetHints(problem: Problem | null): HintState {
  return { level: 0, signature: signatureOf(problem) };
}

export function pressHint(
  state: HintState,
  problem: Problem | null,
): HintState {
  const signature = signatureOf(problem);
  if (signature !== state.signature) return { level: 1, signature };
  return { level: Math.min(3, state.level + 1) as HintLevel, signature };
}
