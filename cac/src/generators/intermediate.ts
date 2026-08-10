import * as Blockly from "blockly";

export const intermediateGenerator = new Blockly.Generator("intermediate");

const Order = {
  NONE: 0,
};

intermediateGenerator.scrub_ = function (block, code, thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  let finalStr = "";
  if (nextBlock && !thisOnly) {
    if (code) {
      finalStr += code + "," + intermediateGenerator.blockToCode(nextBlock);
    } else {
      finalStr += intermediateGenerator.blockToCode(nextBlock);
    }
  } else {
    finalStr += code;
  }
  return finalStr;
};

intermediateGenerator.forBlock["math_number"] = function (block) {
  const code = String(block.getFieldValue("NUM"));
  return [code, Order.NONE];
};

intermediateGenerator.forBlock["wait"] = function (block, generator) {
  const duration = generator.valueToCode(block, "DURATION", Order.NONE) || "0";
  return JSON.stringify({
    type: "wait",
    duration: parseFloat(duration),
  });
};

intermediateGenerator.forBlock["math_arithmetic"] = function (
  block,
  generator,
) {
  const operator = block.getFieldValue("OP");
  const left = generator.valueToCode(block, "A", Order.NONE) || "0";
  const right = generator.valueToCode(block, "B", Order.NONE) || "0";
  switch (operator) {
    case "ADD":
      return [String(parseFloat(left) + parseFloat(right)), Order.NONE];
    case "SUBTRACT":
      return [String(parseFloat(left) - parseFloat(right)), Order.NONE];
    case "MULTIPLY":
      return [String(parseFloat(left) * parseFloat(right)), Order.NONE];
    case "DIVIDE":
      return [String(parseFloat(left) / parseFloat(right)), Order.NONE];
    default:
      throw new Error("Unknown operator: " + operator);
  }
};

intermediateGenerator.forBlock["math_number"] = function (block) {
  const code = String(block.getFieldValue("NUM"));
  return [code, Order.NONE];
};

intermediateGenerator.forBlock["set_position"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return JSON.stringify({
    type: "set_position",
    x: parseInt(x_value),
    y: parseInt(y_value),
  });
};
intermediateGenerator.forBlock["set_x"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  return JSON.stringify({
    type: "set_x",
    x: parseInt(x_value),
  });
};

intermediateGenerator.forBlock["set_y"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return JSON.stringify({
    type: "set_y",
    y: parseInt(y_value),
  });
};

intermediateGenerator.forBlock["when_started"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  return "";
};
