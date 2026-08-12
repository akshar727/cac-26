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

const setPosition = {
  type: "screen_set_position",
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

const setX = {
  type: "screen_set_x",
  tooltip: "",
  helpUrl: "",
  message0: "set position x %1",
  args0: [
    {
      type: "input_value",
      name: "X",
      check: "Number",
      value: 0,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 310,
  inputsInline: true,
};
const setY = {
  type: "screen_set_y",
  tooltip: "",
  helpUrl: "",
  message0: "set position y %1",
  args0: [
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

const wait = {
  type: "logic_wait",
  tooltip: "Wait for a specified amount of time",
  helpUrl: "",
  message0: "wait %1 seconds",
  args0: [
    {
      type: "input_value",
      name: "DURATION",
      check: "Number",
      value: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 210,
  inputsInline: true,
};

export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  whenStarted,
  setPosition,
  setX,
  setY,
  wait,
]);
