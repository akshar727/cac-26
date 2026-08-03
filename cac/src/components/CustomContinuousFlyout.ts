import * as Blockly from "blockly";
import { ContinuousFlyout } from "@blockly/continuous-toolbox";
class CustomContinuousFlyout extends ContinuousFlyout {
  getFlyoutScale() {
    return 0.6; // Adjust the scale factor as needed
  }
}

Blockly.registry.register(
  Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
  "CustomContinuousFlyout",
  CustomContinuousFlyout,
  true,
);
