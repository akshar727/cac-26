import * as Blockly from "blockly";
const theme = Blockly.Theme.defineTheme("codely", {
  name: "codely",
  base: Blockly.Themes.Classic,
  componentStyles: {
    toolboxBackgroundColour: "#f5f5f5",
    flyoutBackgroundColour: "#f5f5f5",
  },
  fontStyle: {
    family: "Instrument Sans, ui-sans-serif, sans-serif, system-ui",
    weight: "bold",
    size: 12,
  },
  categoryStyles: {
    screen_category: {
      colour: "#8b78c7",
    },
    event_category: {
      colour: "#e28b70",
    },
    motion_category: {
      colour: "#5b8def",
    },
    visual_category: {
      colour: "#e6a04d",
    },
    loop_category: {
      colour: "#72b85d",
    },
    logic_category: {
      colour: "#5bb5d6",
    },
    math_category: {
      colour: "#b36bd4",
    },
    text_category: {
      colour: "#5bbd83",
    },
    variable_category: {
      colour: "#d1a34c",
    },
    procedure_category: {
      colour: "#cf6e9b",
    },
  },
  blockStyles: {
    screen_blocks: {
      colourPrimary: "#8b78c7",
      colourSecondary: "#7865b5",
      colourTertiary: "#654fa3",
    },
    event_blocks: {
      colourPrimary: "#e28b70",
      colourSecondary: "#d4775b",
      colourTertiary: "#c36349",
    },
    motion_blocks: {
      colourPrimary: "#5b8def",
      colourSecondary: "#4779db",
      colourTertiary: "#3565c4",
    },
    visual_blocks: {
      colourPrimary: "#e6a04d",
      colourSecondary: "#d88e38",
      colourTertiary: "#c57b24",
    },
    loop_blocks: {
      colourPrimary: "#72b85d",
      colourSecondary: "#5da549",
      colourTertiary: "#4b9138",
    },
    logic_blocks: {
      colourPrimary: "#5bb5d6",
      colourSecondary: "#46a0c2",
      colourTertiary: "#348baa",
    },
    math_blocks: {
      colourPrimary: "#b36bd4",
      colourSecondary: "#9f56c0",
      colourTertiary: "#8a42ab",
    },
    text_blocks: {
      colourPrimary: "#5bbd83",
      colourSecondary: "#47a96f",
      colourTertiary: "#36955c",
    },
    variable_blocks: {
      colourPrimary: "#d1a34c",
      colourSecondary: "#bd9138",
      colourTertiary: "#a87e26",
    },
    procedure_blocks: {
      colourPrimary: "#cf6e9b",
      colourSecondary: "#bc5987",
      colourTertiary: "#a94773",
    },
  },
  startHats: true,
});
export const pastelCategoryColours: Record<string, string> = {
  screen_category: "#c8b6e8",
  event_category: "#f3c7b8",
  motion_category: "#b9d9e8",
  visual_category: "#f2d3ae",
  loop_category: "#c7dfbd",
  logic_category: "#c1dfe8",
  math_category: "#d8c9e4",
  text_category: "#c6e2cc",
  variable_category: "#ead9ad",
  procedure_category: "#e2bfd0",
};

export function getBlocklyTheme(pastel: boolean) {
  if (!pastel) return theme;
  return Blockly.Theme.defineTheme("codely-pastel", {
    name: "codely-pastel",
    base: theme,
    startHats: true,
    categoryStyles: Object.fromEntries(
      Object.entries(pastelCategoryColours).map(([name, colour]) => [
        name,
        { colour },
      ]),
    ),
    blockStyles: Object.fromEntries(
      Object.entries(pastelCategoryColours).map(([name, colour]) => [
        name.replace("_category", "_blocks"),
        {
          colourPrimary: colour,
          colourSecondary: colour,
          colourTertiary: colour,
        },
      ]),
    ),
  });
}

export default theme;
