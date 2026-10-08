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

export type Problem =
  | { kind: "missing-block"; blockType: string; parentId?: string }
  | { kind: "detached"; blockType: string; blockId?: string }
  | { kind: "wrong-block"; expected: string; found: string; blockId?: string }
  | { kind: "empty-input"; blockType: string; input: string; blockId?: string }
  | {
      kind: "wrong-value";
      blockType: string;
      field: string;
      expected: unknown;
      found: unknown;
      blockId?: string;
    };

type Result = { matched: number; problem?: Problem };
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

function diagnose(
  node: BlockState | undefined,
  expected: ExpectedNode | ExpectedNode[],
  parentId: string | undefined,
  resolveVar?: VarResolver,
): Result {
  if (Array.isArray(expected)) {
    let best: Result = { matched: 0 };
    for (const alternative of expected) {
      const result = diagnose(node, alternative, parentId, resolveVar);
      if (!result.problem) return result;
      if (!best.problem || result.matched > best.matched) best = result;
    }
    return best;
  }

  if (!node) {
    return {
      matched: 0,
      problem: {
        kind: "missing-block",
        blockType: expected.blockType,
        parentId,
      },
    };
  }
  if (node.type !== expected.blockType) {
    return {
      matched: 0,
      problem: {
        kind: "wrong-block",
        expected: expected.blockType,
        found: node.type,
        blockId: node.id,
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
          field: fieldName,
          expected: want,
          found: got,
          blockId: node.id,
        },
      };
    }
    matched++;
  }

  for (const [inputName, sub] of Object.entries(expected.inputs ?? {})) {
    const slot: ConnectionState | undefined = node.inputs?.[inputName];
    const child = slot?.block ?? slot?.shadow;
    if (!child) {
      const first = Array.isArray(sub) ? sub[0] : sub;
      return {
        matched,
        problem: {
          kind: "empty-input",
          blockType: first.blockType,
          input: inputName,
          blockId: node.id,
        },
      };
    }
    const result = diagnose(child, sub, node.id, resolveVar);
    matched += result.matched;
    if (result.problem) return { matched, problem: result.problem };
  }

  if (expected.next) {
    const result = diagnose(
      node.next?.block,
      expected.next,
      node.id,
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

export function diagnoseStep(
  topBlocks: BlockState[],
  expected: ExpectedNode | ExpectedNode[],
  resolveVar?: VarResolver,
): Problem | null {
  let best: Result | undefined;
  for (const top of topBlocks) {
    const result = diagnose(top, expected, undefined, resolveVar);
    if (!result.problem) return null;
    if (!best || result.matched > best.matched) best = result;
  }

  const rootType = (Array.isArray(expected) ? expected[0] : expected).blockType;
  const problem: Problem = best?.problem ?? {
    kind: "missing-block",
    blockType: rootType,
  };

  if (problem.kind === "missing-block") {
    const stray = flatten(topBlocks).find(
      (block) => block.type === problem.blockType,
    );
    if (stray) {
      return {
        kind: "detached",
        blockType: problem.blockType,
        blockId: stray.id,
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
  return diagnoseStep(blocks, metric, makeVarResolver(sprites));
}

export type HintLevel = 1 | 2 | 3;

export type Hint = {
  text: string;
  highlightBlockIds: string[];
  highlightToolboxTypes: string[];
  autoFix?: {
    action: "place" | "connect" | "set-field" | "fill";
    blockType: string;
  };
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

  switch (problem.kind) {
    case "missing-block":
      hint.text =
        level === 1
          ? `You need a ${name(problem.blockType)} block. Look for it in the toolbox.`
          : `Add a ${name(problem.blockType)} block. It is glowing in the toolbox.`;
      glowToolbox(problem.blockType, true);
      if (level === 3)
        hint.autoFix = { action: "place", blockType: problem.blockType };
      break;
    case "detached":
      hint.text =
        level === 1
          ? `Your ${name(problem.blockType)} block is not connected yet. Is it snapped in?`
          : `Snap your ${name(problem.blockType)} block under the block above it.`;
      glowBlock(problem.blockId);
      if (level === 3)
        hint.autoFix = { action: "connect", blockType: problem.blockType };
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
      glowBlock(problem.blockId);
      glowToolbox(problem.blockType);
      if (level === 3)
        hint.autoFix = { action: "fill", blockType: problem.blockType };
      break;
    case "wrong-value":
      hint.text =
        level === 1
          ? `Check the ${displayFieldName(problem.field)} in your ${name(problem.blockType)} block. It is not quite right yet.`
          : `Change the ${displayFieldName(problem.field)} to ${displayValue(problem.expected)}. It is currently ${displayValue(problem.found)}.`;
      glowBlock(problem.blockId);
      if (level === 3)
        hint.autoFix = { action: "set-field", blockType: problem.blockType };
      break;
  }
  return hint;
}

export type HintState = { level: 0 | HintLevel; signature: string };

const signatureOf = (problem: Problem | null) =>
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
