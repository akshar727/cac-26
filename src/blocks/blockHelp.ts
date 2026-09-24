export type BlockHelp = {
  title: string;
  description: string;
  simpleExplanation: string;
  example?: string;
};

export const blockHelp: Record<string, BlockHelp> = {
  controls_if: {
    title: "If",
    description: "Runs blocks only when a condition is true.",
    simpleExplanation: "Add conditions to decide what your program should do.",
    example: "if touching edge, rotate clockwise 90 degrees",
  },
  logic_compare: {
    title: "Compare",
    description: "Compares two values using an equality or ordering operator.",
    simpleExplanation: "The result is true or false.",
    example: "x position > 0",
  },
  logic_operation: {
    title: "And / Or",
    description: "Combines two Boolean conditions.",
    simpleExplanation: "AND needs both conditions; OR needs at least one.",
    example: "left arrow key down AND touching edge",
  },
  logic_negate: {
    title: "Not",
    description: "Reverses a Boolean value.",
    simpleExplanation: "True becomes false, and false becomes true.",
  },
  logic_boolean: {
    title: "Boolean",
    description: "Provides a true or false value.",
    simpleExplanation: "Use it as a condition or input to another block.",
  },
  logic_null: {
    title: "Null",
    description: "Provides an empty value.",
    simpleExplanation:
      "Use it when a block needs an intentionally empty input.",
  },
  logic_ternary: {
    title: "Choose",
    description:
      "Returns one value when a condition is true and another when it is false.",
    simpleExplanation: "It is a compact way to choose between two values.",
  },
  controls_whileUntil: {
    title: "While / Until",
    description:
      "Repeats blocks while a condition is true or until it becomes true.",
    simpleExplanation: "The loop checks its condition before each repetition.",
  },
  controls_for: {
    title: "Count With",
    description:
      "Repeats blocks while a number counts from one value to another.",
    simpleExplanation: "Use the counter variable inside the loop.",
  },
  controls_flow_statements: {
    title: "Break / Continue",
    description: "Stops the current loop or skips to its next iteration.",
    simpleExplanation: "Use these only inside a loop.",
  },
  math_number: {
    title: "Number",
    description: "Provides a number value.",
    simpleExplanation: "Type the number another block should use.",
  },
  math_arithmetic: {
    title: "Arithmetic",
    description: "Adds, subtracts, multiplies, or divides two numbers.",
    simpleExplanation: "Choose the operation and provide two values.",
  },
  math_single: {
    title: "Math Operation",
    description: "Applies a mathematical operation to one number.",
    simpleExplanation:
      "Choose an operation such as absolute value or square root.",
  },
  math_trig: {
    title: "Trigonometry",
    description: "Calculates a trigonometric function for an angle.",
    simpleExplanation: "Choose sine, cosine, or tangent and provide an angle.",
  },
  math_constant: {
    title: "Math Constant",
    description: "Provides a standard mathematical constant.",
    simpleExplanation: "Choose a constant such as pi or Euler's number.",
  },
  math_number_property: {
    title: "Number Property",
    description: "Checks a property of a number.",
    simpleExplanation: "The result is true or false.",
  },
  math_round: {
    title: "Round",
    description: "Rounds a number up, down, or to the nearest integer.",
    simpleExplanation: "Choose how the decimal value should be rounded.",
  },
  math_on_list: {
    title: "List Math",
    description: "Calculates a mathematical result from a list.",
    simpleExplanation: "Choose an operation such as sum, minimum, or maximum.",
  },
  math_modulo: {
    title: "Remainder",
    description: "Reports the remainder after dividing one number by another.",
    simpleExplanation:
      "This is useful for repeating patterns and checking divisibility.",
  },
  math_constrain: {
    title: "Constrain",
    description: "Keeps a number between a lower and upper limit.",
    simpleExplanation: "Values outside the range become the nearest limit.",
  },
  math_random_int: {
    title: "Random Integer",
    description: "Chooses a random whole number in a range.",
    simpleExplanation: "Both endpoints are included in the possible results.",
  },
  math_random_float: {
    title: "Random Fraction",
    description: "Chooses a random decimal value between zero and one.",
    simpleExplanation: "Use it when you need unpredictable fractional values.",
  },
  math_atan2: {
    title: "Atan2",
    description: "Calculates the angle from two coordinate values.",
    simpleExplanation: "Use it to find the direction toward a point.",
  },
  text: {
    title: "Text",
    description: "Provides a text value.",
    simpleExplanation: "Type the words another block should use.",
  },
  text_join: {
    title: "Join Text",
    description: "Combines multiple text values into one string.",
    simpleExplanation: "Add inputs to build a longer message.",
  },
  text_append: {
    title: "Append Text",
    description: "Adds text to the end of a variable's current value.",
    simpleExplanation: "Use it to add text onto a message.",
  },
  text_length: {
    title: "Text Length",
    description: "Reports the number of characters in text.",
    simpleExplanation: "Spaces and punctuation count as characters.",
  },
  text_isEmpty: {
    title: "Text Is Empty",
    description: "Checks whether text contains no characters.",
    simpleExplanation: "The result is true when the text is empty.",
  },
  text_charAt: {
    title: "Character At",
    description: "Reports the character at a selected position in text.",
    simpleExplanation: "Use an index to choose which character to read.",
  },
  text_changeCase: {
    title: "Change Case",
    description: "Converts text to uppercase, lowercase, or title case.",
    simpleExplanation: "Choose the capitalization style you need.",
  },
  text_trim: {
    title: "Trim Text",
    description: "Removes whitespace from the beginning and end of text.",
    simpleExplanation: "Use it to clean up user-entered text.",
  },
  text_count: {
    title: "Count Text",
    description: "Counts how many times one piece of text appears in another.",
    simpleExplanation: "The result is the number of matches.",
  },
  text_replace: {
    title: "Replace Text",
    description: "Replaces matching text with new text.",
    simpleExplanation: "Use it to edit or transform a message.",
  },
  text_reverse: {
    title: "Reverse Text",
    description: "Reverses the order of characters in text.",
    simpleExplanation: "The last character becomes the first.",
    example: "reverse Hello becomes olleH",
  },
  events_when_started: {
    title: "When Started",
    description: "Runs the connected blocks when the program starts.",
    simpleExplanation: "Use this block to begin a script automatically.",
    example: "when started, say Hello",
  },
  events_when_key_pressed: {
    title: "When Key Pressed",
    description: "Runs the connected blocks when the selected key is pressed.",
    simpleExplanation:
      "Choose a key to create a keyboard-controlled set of blocks.",
    example: "when space key pressed, change y position by 10",
  },
  events_when_sprite_clicked: {
    title: "When Sprite Clicked",
    description: "Runs the connected blocks when this sprite is clicked.",
    simpleExplanation: "Use it to make a sprite respond to a click.",
    example: "when this sprite clicked, say Hello",
  },
  events_when_broadcast_received: {
    title: "When I Receive",
    description: "Runs the connected blocks when a broadcast message arrives.",
    simpleExplanation: "This starts a script from another sprite or script.",
    example: "when I receive start game",
  },
  events_broadcast: {
    title: "Broadcast",
    description: "Sends a message to all sprites.",
    simpleExplanation: "Other scripts can listen for this message and react.",
    example: "broadcast start game",
  },
  screen_set_position: {
    title: "Set Position",
    description: "Moves the sprite to the specified x and y coordinates.",
    simpleExplanation: "X controls left and right; Y controls up and down.",
    example: "set position x 0, y 0",
  },
  screen_set_x: {
    title: "Set X Position",
    description: "Sets the sprite's horizontal position.",
    simpleExplanation: "A larger X moves the sprite farther right.",
    example: "set position x 100",
  },
  screen_set_y: {
    title: "Set Y Position",
    description: "Sets the sprite's vertical position.",
    simpleExplanation: "A larger Y moves the sprite higher on the screen.",
    example: "set y position 50",
  },
  logic_wait: {
    title: "Wait",
    description: "Pauses the script for the specified number of seconds.",
    simpleExplanation: "The blocks below it run after the pause.",
    example: "wait 1 seconds",
  },
  motion_movesteps: {
    title: "Move",
    description: "Moves the sprite forward.",
    simpleExplanation: "The number tells the sprite how many steps to move.",
    example: "move 10 steps",
  },

  controls_repeat_ext: {
    title: "Repeat",
    description: "Runs the blocks inside it multiple times.",
    simpleExplanation: "Think: “Do these things again and again.”",
    example: "repeat 10 times",
  },
  controls_forever: {
    title: "Forever",
    description: "Repeats the blocks inside it continuously.",
    simpleExplanation: "Use it for behavior that should keep running.",
    example: "forever, move 10 steps",
  },
  screen_position_x: {
    title: "X Position",
    description: "Reports the sprite's current horizontal position.",
    simpleExplanation:
      "Use this value when another block needs the sprite's X coordinate.",
  },
  screen_position_y: {
    title: "Y Position",
    description: "Reports the sprite's current vertical position.",
    simpleExplanation:
      "Use this value when another block needs the sprite's Y coordinate.",
  },
  screen_change_x: {
    title: "Change X",
    description: "Changes the sprite's horizontal position by an amount.",
    simpleExplanation: "Positive values move right; negative values move left.",
    example: "change x by 10",
  },
  screen_change_y: {
    title: "Change Y",
    description: "Changes the sprite's vertical position by an amount.",
    simpleExplanation: "Positive values move up; negative values move down.",
    example: "change y by -10",
  },
  screen_rotate_clockwise: {
    title: "Turn Clockwise",
    description: "Turns the sprite clockwise by the specified degrees.",
    simpleExplanation: "Use positive degrees to rotate to the right.",
    example: "rotate clockwise 15 degrees",
  },
  screen_rotate_counterclockwise: {
    title: "Turn Counterclockwise",
    description: "Turns the sprite counterclockwise by the specified degrees.",
    simpleExplanation: "Use this to rotate the sprite to the left.",
    example: "rotate counterclockwise 15 degrees",
  },
  screen_set_rotation: {
    title: "Set Rotation",
    description: "Sets the sprite's rotation to a specific angle.",
    simpleExplanation:
      "This chooses an exact rotation instead of changing the current one.",
    example: "set rotation to 90 degrees",
  },
  screen_rotation: {
    title: "Rotation",
    description: "Reports the sprite's current rotation.",
    simpleExplanation:
      "Use this value when another block needs the rotation angle.",
  },
  screen_next_costume: {
    title: "Next Costume",
    description: "Changes the sprite to its next costume.",
    simpleExplanation: "Use it to animate a sprite through its costumes.",
  },
  screen_set_costume: {
    title: "Set Costume",
    description: "Changes the sprite to the selected costume.",
    simpleExplanation: "Choose the costume that should be displayed.",
    example: "set costume to happy",
  },
  screen_show: {
    title: "Show",
    description: "Makes the current sprite visible.",
    simpleExplanation:
      "The sprite appears on the screen after this block runs.",
  },
  screen_hide: {
    title: "Hide",
    description: "Makes the current sprite invisible.",
    simpleExplanation:
      "The sprite still exists, but it is not drawn on screen.",
  },
  screen_change_size: {
    title: "Change Size",
    description: "Changes the sprite's size by a percentage amount.",
    simpleExplanation:
      "Positive values make it larger; negative values make it smaller.",
    example: "change size by 10",
  },
  screen_set_size: {
    title: "Set Size",
    description: "Sets the sprite's size to a percentage.",
    simpleExplanation: "100% is the sprite's original size.",
    example: "set size to 50%",
  },
  screen_glide: {
    title: "Glide",
    description: "Moves the sprite smoothly to a position over time.",
    simpleExplanation:
      "The first value controls duration, followed by the destination.",
    example: "glide 1 seconds to x 100 y 50",
  },
  screen_glide_preset: {
    title: "Glide To",
    description: "Glides the sprite to a selected location or sprite.",
    simpleExplanation: "Choose the target and how long the glide should take.",
    example: "glide to mouse-pointer in 1 seconds",
  },
  logic_touching: {
    title: "Touching",
    description: "Reports whether the sprite is touching the selected target.",
    simpleExplanation: "This Boolean value can be used to make decisions.",
    example: "if touching edge",
  },
  screen_distance_to: {
    title: "Distance To",
    description: "Reports the distance from the sprite to a selected target.",
    simpleExplanation:
      "Use the number to react when something is near or far away.",
    example: "distance to mouse-pointer",
  },
  screen_height: {
    title: "Screen Height",
    description: "Reports the height of the screen.",
    simpleExplanation:
      "Use this value to calculate vertical positions dynamically.",
  },
  screen_width: {
    title: "Screen Width",
    description: "Reports the width of the screen.",
    simpleExplanation:
      "Use this value to calculate horizontal positions dynamically.",
  },
  screen_sprite_size: {
    title: "Sprite Size",
    description: "Reports the current size of the sprite.",
    simpleExplanation:
      "The result is expressed as a percentage of the original size.",
  },
  logic_key_down: {
    title: "Key Down",
    description: "Reports whether the selected key is currently held down.",
    simpleExplanation: "Use it to create continuous keyboard controls.",
    example: "if space key down",
  },
  logic_mouse_down: {
    title: "Mouse Down",
    description: "Reports whether the mouse button is currently held down.",
    simpleExplanation:
      "Use it to respond while the user is holding the mouse button.",
  },
  screen_mouse_x: {
    title: "Mouse X",
    description: "Reports the mouse pointer's horizontal position.",
    simpleExplanation: "Use this value to follow or measure the mouse pointer.",
  },
  screen_mouse_y: {
    title: "Mouse Y",
    description: "Reports the mouse pointer's vertical position.",
    simpleExplanation: "Use this value to follow or measure the mouse pointer.",
  },
  screen_say: {
    title: "Say",
    description: "Shows a speech bubble with a message for a duration.",
    simpleExplanation: "The sprite displays the message above itself.",
    example: "say Hello for 2 seconds",
  },
  screen_think: {
    title: "Think",
    description: "Shows a thought bubble with a message for a duration.",
    simpleExplanation: "The sprite displays the message in a thought bubble.",
    example: "think Hmm for 2 seconds",
  },
  screen_clear_speech_bubbles: {
    title: "Clear Speech Bubbles",
    description: "Removes all speech and thought bubbles from the screen.",
    simpleExplanation: "Use it to clear messages before showing new ones.",
  },
  procedures_defnoreturn: {
    title: "Define Function",
    description: "Creates a custom block that runs the connected blocks.",
    simpleExplanation: "Use it to group blocks together and give them a name.",
  },
  variables_set: {
    title: "Set Variable",
    description: "Changes the value of a variable.",
    simpleExplanation: "Choose a variable and provide a new value for it.",
  },
  variables_get: {
    title: "Get Variable",
    description: "Reports the current value of a variable.",
    simpleExplanation: "Use this block to read the value of a variable.",
  },
  math_change: {
    title: "Change Variable",
    description: "Increases or decreases a variable's value by an amount.",
    simpleExplanation: "Use it to add or subtract from a variable.",
  },
  procedures_callnoreturn: {
    title: "Call Function",
    description: "Runs the blocks inside a custom block.",
    simpleExplanation: "Use it to execute the code defined in a function.",
  },
  math_round_to: {
    title: "Round to Decimal Places",
    description: "Rounds a number to a specified number of decimal places.",
    simpleExplanation:
      "Use it to round a number to a specific number of decimal places.",
    example: "round 5.23 to 1 decimal place",
  },
  screen_clone: {
    title: "Clone",
    description: "Creates a copy of the sprite.",
    simpleExplanation:
      "Use it to create multiple instances of a sprite. Each clone runs the same scripts as the original sprite.",
  },
};
