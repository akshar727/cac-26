import * as Blockly from "blockly";

const DEFAULT_FONT_FAMILY =
  "Instrument Sans, ui-sans-serif, sans-serif, system-ui";
const HYPERLEGIBLE_FONT_FAMILY = '"Atkinson Hyperlegible", sans-serif';
const BLOCK_FONT_WEIGHT = "bold";
const NORMAL_FONT_SIZE = 12;
const LARGE_FONT_SIZE = 16;
const FONT_PROBE_TEXT = "Hg ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789";

export type BlockAccessbility = {
  textSize?: "normal" | "large";
  hyperlegible?: boolean;
};

type BlockPalette = {
  colourPrimary: string;
  colourSecondary: string;
  colourTertiary: string;
};

export function getBlocklyFontStyle(accessibilitySettings: BlockAccessbility = {}) {
  return {
    family:
      accessibilitySettings.hyperlegible === true
        ? HYPERLEGIBLE_FONT_FAMILY
        : DEFAULT_FONT_FAMILY,
    weight: BLOCK_FONT_WEIGHT,
    size: accessibilitySettings.textSize === "large" ? LARGE_FONT_SIZE : NORMAL_FONT_SIZE,
  };
}

export async function loadBlocklyFonts(
  accessibilitySettings: BlockAccessbility = {},
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const { family, weight, size } = getBlocklyFontStyle(accessibilitySettings);
  try {
    await document.fonts.load(`${weight} ${size}pt ${family}`, FONT_PROBE_TEXT);
    await document.fonts.ready;
  } catch {
    return;
  }
}

function categoryNameFor(blockStyleName: string) {
  return blockStyleName.replace(/_blocks$/, "_category");
}

function categoryStylesFrom(styles: Record<string, BlockPalette>) {
  return Object.fromEntries(
    Object.entries(styles).map(([name, palette]) => [
      categoryNameFor(name),
      { colour: palette.colourPrimary },
    ]),
  );
}

const blockStyles: Record<string, BlockPalette> = {
  screen_blocks: {
    colourPrimary: "#7c67c0",
    colourSecondary: "#6c55b9",
    colourTertiary: "#5f47ad",
  },
  event_blocks: {
    colourPrimary: "#d53b4c",
    colourSecondary: "#cb2b3d",
    colourTertiary: "#b62737",
  },
  motion_blocks: {
    colourPrimary: "#2e6eeb",
    colourSecondary: "#175ee9",
    colourTertiary: "#1454d2",
  },
  visual_blocks: {
    colourPrimary: "#a76517",
    colourSecondary: "#915714",
    colourTertiary: "#7a4a11",
  },
  loop_blocks: {
    colourPrimary: "#4a8239",
    colourSecondary: "#407031",
    colourTertiary: "#365f29",
  },
  logic_blocks: {
    colourPrimary: "#277e9e",
    colourSecondary: "#226e8a",
    colourTertiary: "#1d5d75",
  },
  math_blocks: {
    colourPrimary: "#a44fcc",
    colourSecondary: "#9a3bc6",
    colourTertiary: "#8b34b4",
  },
  text_blocks: {
    colourPrimary: "#358355",
    colourSecondary: "#2e7149",
    colourTertiary: "#265f3d",
  },
  variable_blocks: {
    colourPrimary: "#956f26",
    colourSecondary: "#816021",
    colourTertiary: "#6c511c",
  },
  procedure_blocks: {
    colourPrimary: "#c34881",
    colourSecondary: "#b63c74",
    colourTertiary: "#a33568",
  },
};

export const pastelBlockStyles: Record<string, BlockPalette> = {
  screen_blocks: {
    colourPrimary: "#c8b6e8",
    colourSecondary: "#b3a0d5",
    colourTertiary: "#9d8ac1",
  },
  event_blocks: {
    colourPrimary: "#e8b6bb",
    colourSecondary: "#d19199",
    colourTertiary: "#b96d78",
  },
  motion_blocks: {
    colourPrimary: "#b9d9e8",
    colourSecondary: "#9fc2d2",
    colourTertiary: "#86aaba",
  },
  visual_blocks: {
    colourPrimary: "#f2d3ae",
    colourSecondary: "#dcba91",
    colourTertiary: "#c3a176",
  },
  loop_blocks: {
    colourPrimary: "#c7dfbd",
    colourSecondary: "#a9c99f",
    colourTertiary: "#8faf86",
  },
  logic_blocks: {
    colourPrimary: "#c1dfe8",
    colourSecondary: "#a2c4cf",
    colourTertiary: "#88aab5",
  },
  math_blocks: {
    colourPrimary: "#d8c9e4",
    colourSecondary: "#bdaed0",
    colourTertiary: "#a493ba",
  },
  text_blocks: {
    colourPrimary: "#c6e2cc",
    colourSecondary: "#a7c9ae",
    colourTertiary: "#8eaf95",
  },
  variable_blocks: {
    colourPrimary: "#ead9ad",
    colourSecondary: "#d2bd8d",
    colourTertiary: "#b9a36f",
  },
  procedure_blocks: {
    colourPrimary: "#e2bfd0",
    colourSecondary: "#cda4b7",
    colourTertiary: "#b8899e",
  },
};

export const pastelCategoryColours: Record<string, string> = Object.fromEntries(
  Object.entries(pastelBlockStyles).map(([name, palette]) => [
    categoryNameFor(name),
    palette.colourPrimary,
  ]),
);

const theme = Blockly.Theme.defineTheme("codely", {
  name: "codely",
  base: Blockly.Themes.Classic,
  componentStyles: {
    toolboxBackgroundColour: "#f1f0ec",
    flyoutBackgroundColour: "#f1f0ec",
  },
  fontStyle: getBlocklyFontStyle(),
  categoryStyles: categoryStylesFrom(blockStyles),
  blockStyles,
  startHats: true,
});

export function getBlocklyTheme(pastel: boolean, accessibilitySettings: BlockAccessbility = {}) {
  const base = pastel
    ? Blockly.Theme.defineTheme("codely-pastel", {
        name: "codely-pastel",
        base: theme,
        startHats: true,
        componentStyles: {
          toolboxBackgroundColour: "#f1eff8",
          flyoutBackgroundColour: "#f1eff8",
        },
        categoryStyles: categoryStylesFrom(pastelBlockStyles),
        blockStyles: pastelBlockStyles,
      })
    : theme;

  const large = accessibilitySettings.textSize === "large";
  const hyperlegible = accessibilitySettings.hyperlegible === true;
  if (!large && !hyperlegible) return base;

  const name = `${base.name}${large ? "-large" : ""}${hyperlegible ? "-hyperlegible" : ""}`;
  return Blockly.Theme.defineTheme(name, {
    name,
    base,
    startHats: true,
    fontStyle: getBlocklyFontStyle(accessibilitySettings),
  });
}

export default theme;
