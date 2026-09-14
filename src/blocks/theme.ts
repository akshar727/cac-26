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
      colour: "310",
    },
    event_category: {
      colour: "44",
    },
    motion_category: {
      colour: "260",
    },
    visual_category: {
      colour: "20",
    },
    loop_category: {
      colour: "113",
    },
  },
  startHats: true,
});
export default theme;
