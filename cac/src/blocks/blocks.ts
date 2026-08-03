import * as Blockly from "blockly";

const whenStarted = {
  type: "when_started",
  tooltip: "Run code when the program starts",
  helpUrl: "",
  message0: "When Started",
  nextStatement: null,
  colour: 60,
  inputsInline: true,
};

// const canvasRect = {
//   type: "canvas_rect",
//   message0: "draw %1 colored rectangle at x %2 y %3 width %4 height %5",
//   args0: [
//     {
//       type: "field_colour_hsv_sliders",
//       name: "COLOR",
//       colour: "#ff0000",
//     },
//     {
//       type: "input_value",
//       name: "XPOS",
//       check: "Number",
//     },
//     {
//       type: "input_value",
//       name: "YPOS",
//       check: "Number",
//     },
//     {
//       type: "input_value",
//       name: "WIDTH",
//       check: "Number",
//     },
//     {
//       type: "input_value",
//       name: "HEIGHT",
//       check: "Number",
//     },
//   ],
//   previousStatement: null,
//   nextStatement: null,
//   colour: 310,
//   inputsInline: false,
// };

const setPosition = {
  type: "set_position",
  tooltip: "",
  helpUrl: "",
  message0: "set position x %1 y %2",
  args0: [
    {
      type: "input_value",
      name: "X",
      check: "Number",
      value: 0,
    },
    {
      type: "input_value",
      name: "Y",
      check: "Number",
      value: 0,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 310,
  inputsInline: true,
};

const drawText = {
  type: "draw_text",
  tooltip:
    "Draws text on the canvas at the specified position with the specified font, color, and size.",
  helpUrl: "",
  message0: "draw text %1 font %2 color %3 font size %4 at x-pos %5 y-pos %6",
  args0: [
    {
      type: "input_value",
      name: "TEXT",
      check: "String",
      text: "default",
    },
    {
      type: "field_dropdown",
      name: "FONT",
      options: [
        ["Arial", "ARIAL"],
        ["Monospace", "MONOSPACE"],
        ["Sans-Serif", "SANS-SERIF"],
      ],
    },
    {
      type: "field_colour_hsv_sliders",
      name: "COLOR",
      colour: "#ff0000",
    },
    {
      type: "input_value",
      name: "FONTSIZE",
      value: 0,
      min: 0,
      max: 127,
      precision: 1,
    },
    {
      type: "input_value",
      name: "XPOS",
      value: 0,
      min: 0,
      max: 400,
      precision: 1,
    },
    {
      type: "input_value",
      name: "YPOS",
      value: 0,
      min: 0,
      max: 800,
      precision: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 310,
};

export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  // canvasRect,
  whenStarted,
  setPosition,
  drawText,
]);
