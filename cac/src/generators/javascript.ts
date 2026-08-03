/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order } from "blockly/javascript";
import * as Blockly from "blockly/core";

// Export all the code generators for our custom blocks,
// but don't register them with Blockly yet.
// This file has no side effects!
export const forBlock = Object.create(null);

// forBlock["canvas_rect"] = function (
//   block: Blockly.Block,
//   generator: Blockly.CodeGenerator,
// ) {
//   const color = generator.quote_(block.getFieldValue("COLOR")) || "'#ff0000'";
//   const xPos = generator.valueToCode(block, "XPOS", Order.NONE) || "0";
//   const yPos = generator.valueToCode(block, "YPOS", Order.NONE) || "0";
//   const width = generator.valueToCode(block, "WIDTH", Order.NONE) || "100";
//   const height = generator.valueToCode(block, "HEIGHT", Order.NONE) || "100";

//   const drawRect = generator.provideFunction_(
//     "drawRect",
//     `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(color, x, y, width, height) {
//   const canvas = document.getElementById('outputCanvas');
//   if (!canvas || !canvas.getContext) {
//     return;
//   }

//   const ctx = canvas.getContext('2d');
//   if (!ctx) {
//     return;
//   }

//   ctx.fillStyle = color;
//   ctx.fillRect(Number(x) || 0, Number(y) || 0, Number(width) || 0, Number(height) || 0);
// }`,
//   );

//   const code = `${drawRect}(${color}, ${xPos}, ${yPos}, ${width}, ${height});\n`;
//   return code;
// };

forBlock["draw_text"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const text_text =
    generator.valueToCode(block, "TEXT", Order.NONE) || "default";
  const dropdown_font =
    generator.quote_(block.getFieldValue("FONT")) || "'Arial'";
  const colour_color =
    generator.quote_(block.getFieldValue("COLOR")) || "#000000";
  const number_fontsize =
    generator.valueToCode(block, "FONTSIZE", Order.NONE) || "12";
  const number_xpos = generator.valueToCode(block, "XPOS", Order.NONE) || "0";
  const number_ypos = generator.valueToCode(block, "YPOS", Order.NONE) || "0";
  const drawText = generator.provideFunction_(
    "drawText",
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(text, font, color, fontSize, x, y) {
  const canvas = document.getElementById('backgroundCanvas');
  if (!canvas || !canvas.getContext) {
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
    ctx.textBaseline = "middle"; 
ctx.textAlign = "center";

  ctx.font = fontSize + 'px ' + font;
  ctx.fillStyle = color;
  ctx.fillText(text, Number(x) || 0, Number(y) || 0);
}`,
  );
  const code = `${drawText}(${text_text}, ${dropdown_font}, ${colour_color}, ${number_fontsize}, ${number_xpos}, ${number_ypos});\n`;
  return code;
};

forBlock["when_started"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const nextBlock = block.getNextBlock();
  const branchCode = nextBlock ? generator.blockToCode(nextBlock) : "";

  const functionName = generator.provideFunction_(
    "whenStarted_" + block.id.replace(/[^a-zA-Z0-9]/g, "_"),
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}() {\n${branchCode}}\n`,
  );

  generator.provideFunction_(
    "reg_" + block.id.replace(/[^a-zA-Z0-9]/g, "_"),
    `registerEvent('run_${block.id}', ${functionName});\n`,
  );
  return null;
};

forBlock["set_position"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator,
) {
  const x_value = generator.valueToCode(block, "X", Order.NONE) || "0";
  const y_value = generator.valueToCode(block, "Y", Order.NONE) || "0";
  return (
    "let task = blitTasks.find(t => t.spriteId === activeSprite.id);\nif (task) { task.x = " +
    x_value +
    "; task.y = " +
    y_value +
    "; };\nrunBlitTasks();\n"
  );
};
