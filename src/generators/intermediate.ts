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
  return [
    JSON.stringify({
      type: "math_number",
      value: parseFloat(block.getFieldValue("NUM")),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["logic_wait"] = function (block, generator) {
  const duration = generator.valueToCode(block, "DURATION", Order.NONE) || "0";
  return JSON.stringify({
    type: "logic_wait",
    duration: getFormatted(duration),
  });
};

intermediateGenerator.forBlock["math_arithmetic"] = function (
  block,
  generator,
) {
  const operator = block.getFieldValue("OP");
  const left = generator.valueToCode(block, "A", Order.NONE) || "0";
  const right = generator.valueToCode(block, "B", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "math_arithmetic",
      operator: operator,
      left: getFormatted(left),
      right: getFormatted(right),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_single"] = function (block, generator) {
  const operator = block.getFieldValue("OP");
  const operand = generator.valueToCode(block, "NUM", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "math_single",
      operator: operator,
      operand: getFormatted(operand),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_trig"] = function (block, generator) {
  const operator = block.getFieldValue("OP");
  const operand = generator.valueToCode(block, "NUM", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "math_trig",
      operator: operator,
      operand: getFormatted(operand),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_constant"] = function (block, _) {
  const constant = block.getFieldValue("CONSTANT");

  return [
    JSON.stringify({
      type: "math_constant",
      constant: constant,
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_round"] = function (block, generator) {
  const operator = block.getFieldValue("OP");
  const operand = generator.valueToCode(block, "NUM", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "math_round",
      operator: operator,
      operand: getFormatted(operand),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["screen_set_position"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return JSON.stringify({
    type: "screen_set_position",
    x: getFormatted(x_value),
    y: getFormatted(y_value),
  });
};
intermediateGenerator.forBlock["screen_set_x"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  return JSON.stringify({
    type: "screen_set_x",
    x: getFormatted(x_value),
  });
};

intermediateGenerator.forBlock["math_modulo"] = function (block, generator) {
  const dividend = generator.valueToCode(block, "DIVIDEND", Order.NONE) || "0";
  const divisor = generator.valueToCode(block, "DIVISOR", Order.NONE) || "1";
  return [
    JSON.stringify({
      type: "math_modulo",
      dividend: getFormatted(dividend),
      divisor: getFormatted(divisor),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_constrain"] = function (block, generator) {
  const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  const low = generator.valueToCode(block, "LOW", Order.NONE) || "0";
  const high = generator.valueToCode(block, "HIGH", Order.NONE) || "1";
  return [
    JSON.stringify({
      type: "math_constrain",
      value: getFormatted(value),
      low: getFormatted(low),
      high: getFormatted(high),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_random_int"] = function (
  block,
  generator,
) {
  const from = generator.valueToCode(block, "FROM", Order.NONE) || "0";
  const to = generator.valueToCode(block, "TO", Order.NONE) || "1";
  return [
    JSON.stringify({
      type: "math_random_int",
      from: getFormatted(from),
      to: getFormatted(to),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_random_float"] = function (_, __) {
  return [
    JSON.stringify({
      type: "math_random_float",
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["math_atan2"] = function (block, generator) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "math_atan2",
      x: getFormatted(x_value),
      y: getFormatted(y_value),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["variables_get"] = function (block, _) {
  const variableName = block.getFieldValue("VAR");
  return [
    JSON.stringify({
      type: "variables_get",
      name: variableName,
    }),
    Order.NONE,
  ];
};
intermediateGenerator.forBlock["variables_set"] = function (block, generator) {
  const variableName = block.getFieldValue("VAR");
  const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return JSON.stringify({
    type: "variables_set",
    name: variableName,
    value: getFormatted(value),
  });
};

intermediateGenerator.forBlock["math_change"] = function (block, generator) {
  const variableName = block.getFieldValue("VAR");
  const value = generator.valueToCode(block, "DELTA", Order.NONE) || "0";
  return JSON.stringify({
    type: "math_change",
    name: variableName,
    value: getFormatted(value),
  });
};

intermediateGenerator.forBlock["controls_if"] = function (block, generator) {
  let n = 0;
  let base = {
    type: "controls_if",
  };
  do {
    const condition =
      generator.valueToCode(block, "IF" + n, Order.NONE) || "{}";
    const thenBody = intermediateGenerator.statementToCode(block, "DO" + n);
    //@ts-expect-error
    base["condition" + n] = getFormatted(condition);
    //@ts-expect-error
    base["thenBody" + n] = JSON.parse("[" + thenBody + "]");
    n++;
  } while (block.getInput("IF" + n));
  if (block.getInput("ELSE")) {
    const elseBody = intermediateGenerator.statementToCode(block, "ELSE");
    //@ts-expect-error
    base["elseBody"] = JSON.parse("[" + elseBody + "]");
  }
  return JSON.stringify(base);
};

intermediateGenerator.forBlock["logic_compare"] = function (block, generator) {
  const operator = block.getFieldValue("OP");
  const left = generator.valueToCode(block, "A", Order.NONE) || "0";
  const right = generator.valueToCode(block, "B", Order.NONE) || "0";
  return [
    JSON.stringify({
      type: "logic_compare",
      operator: operator,
      left: getFormatted(left),
      right: getFormatted(right),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["logic_operation"] = function (
  block,
  generator,
) {
  const operator = block.getFieldValue("OP");
  const left = generator.valueToCode(block, "A", Order.NONE) || "false";
  const right = generator.valueToCode(block, "B", Order.NONE) || "false";
  return [
    JSON.stringify({
      type: "logic_operation",
      operator: operator,
      left: getFormatted(left),
      right: getFormatted(right),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["logic_negate"] = function (block, generator) {
  const operand = generator.valueToCode(block, "BOOL", Order.NONE) || "false";
  return [
    JSON.stringify({
      type: "logic_negate",
      operand: getFormatted(operand),
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["logic_boolean"] = function (block, _) {
  const value = block.getFieldValue("BOOL") === "TRUE";
  return [
    JSON.stringify({
      type: "logic_boolean",
      value: value,
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["logic_null"] = function (block, _) {
  return [
    JSON.stringify({
      type: "logic_null",
      value: null,
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["controls_repeat_ext"] = function (
  block,
  generator,
) {
  const times = generator.valueToCode(block, "TIMES", Order.NONE) || "0";
  const branch = intermediateGenerator.statementToCode(block, "DO");
  return JSON.stringify({
    type: "controls_repeat_ext",
    times: getFormatted(times),
    body: JSON.parse("[" + branch + "]"),
  });
};

intermediateGenerator.forBlock["controls_flow_statements"] = function (
  block,
  _,
) {
  const flow = block.getFieldValue("FLOW");
  return JSON.stringify({
    type: "controls_flow_statements",
    flow: flow,
  });
};

intermediateGenerator.forBlock["procedures_defnoreturn"] = function (
  block,
  generator,
) {
  const name = block.getFieldValue("NAME");
  let body = [];
  if (block.getInput("STACK")) {
    body = JSON.parse(
      `[${intermediateGenerator.statementToCode(block, "STACK")}]`,
    );
  }
  let returnValue = null;
  if (block.getInput("RETURN")) {
    returnValue = generator.valueToCode(block, "RETURN", Order.NONE) || "0";
  }
  const variables = block.getVarModels();
  console.log("Variables for procedure", name, ":", variables);
  return JSON.stringify({
    type: block.type,
    name: name,
    parameters: variables.map((v) => {
      //@ts-ignore
      return { name: v.name, id: v.id };
    }),
    body: body || [],
    returnValue: returnValue ? getFormatted(returnValue) : null,
  });
};
intermediateGenerator.forBlock["procedures_defreturn"] =
  intermediateGenerator.forBlock["procedures_defnoreturn"];
//@ts-ignore
intermediateGenerator.forBlock["procedures_callnoreturn"] = function (
  block,
  generator,
) {
  const name = block.getFieldValue("NAME");
  const args = block.getVarModels().map((varName, index) => {
    return JSON.stringify({
      name: varName.getId(),
      value: getFormatted(
        generator.valueToCode(block, "ARG" + index, Order.NONE) || "0",
      ),
    });
  });
  if (block.type === "procedures_callreturn") {
    console.log("a");
    return [
      JSON.stringify({
        type: block.type,
        name: name,
        //@ts-ignore
        arguments: args.map((arg) => getFormatted(arg)),
      }),
      Order.NONE,
    ];
  } else {
    return JSON.stringify({
      type: block.type,
      name: name,
      //@ts-ignore
      arguments: args.map((arg) => getFormatted(arg)),
    });
  }
};

intermediateGenerator.forBlock["procedures_callreturn"] =
  intermediateGenerator.forBlock["procedures_callnoreturn"];

function getFormatted(value: string): number | object {
  let number = true;
  let json = true;
  if (isNaN(parseFloat(value))) {
    number = false;
  }
  try {
    JSON.parse(value);
  } catch (e) {
    json = false;
  }
  if (!number && !json) {
    console.warn(
      "Warning: The value for a block is neither a number nor valid JSON:",
      value,
    );
  }
  let formatted = 0;
  if (number) {
    formatted = parseFloat(value);
  }
  if (json) {
    formatted = JSON.parse(value);
  }
  return formatted;
}

intermediateGenerator.forBlock["screen_set_y"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return JSON.stringify({
    type: "screen_set_y",
    y: getFormatted(y_value),
  });
};

intermediateGenerator.forBlock["screen_position_x"] = function (_, __) {
  return [
    JSON.stringify({
      type: "screen_position_x",
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["screen_position_y"] = function (_, __) {
  return [
    JSON.stringify({
      type: "screen_position_y",
    }),
    Order.NONE,
  ];
};

intermediateGenerator.forBlock["when_started"] = function (_, __) {
  return "";
};
