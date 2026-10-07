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
      colour: "#d84a5a",
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
      colourPrimary: "#d84a5a",
      colourSecondary: "#bd3848",
      colourTertiary: "#9f2938",
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
  event_category: "#e8b6bb",
  motion_category: "#b9d9e8",
  visual_category: "#f2d3ae",
  loop_category: "#c7dfbd",
  logic_category: "#c1dfe8",
  math_category: "#d8c9e4",
  text_category: "#c6e2cc",
  variable_category: "#ead9ad",
  procedure_category: "#e2bfd0",
};

export const pastelBlockStyles: Record<
  string,
  { colourPrimary: string; colourSecondary: string; colourTertiary: string }
> = {
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
    blockStyles: pastelBlockStyles,
  });
}

export function watchPastelTextContrast(
  container: HTMLElement,
  pastel: boolean,
): MutationObserver | null {
  const applyContrast = () => {
    container
      .querySelectorAll<SVGTextElement>(
        ".blocklyText, .blocklyDropdownText, .blocklyFlyoutLabelText, .blocklyToolboxCategoryLabel",
      )
      .forEach((element) => {
        element.style.setProperty("fill", pastel ? "#263238" : "", "important");
      });

    document
      .querySelectorAll<HTMLElement>(
        ".blocklyDropDownDiv .blocklyMenuItemContent, .blocklyWidgetDiv .blocklyMenuItemContent",
      )
      .forEach((element) => {
        element.style.setProperty("color", pastel ? "#000" : "", "important");
      });
  };

  applyContrast();
  if (!pastel) return null;

  const observer = new MutationObserver(applyContrast);
  observer.observe(container, { childList: true, subtree: true });
  return observer;
}

export default theme;
