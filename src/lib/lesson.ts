export type Lesson = {
  id: number;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  longDescription: string;
  allowedBlocks: string[] | string[][];
  instructions: string[];
  blocksToHighlight: string[][];
  successMetrics: any[];
  baseState: {
    sprites: {
      id: number;
      name: string;
      x: number;
      y: number;
      image_paths: {
        costumeName: string;
        loadablePath: string | null;
        truePath: string | null;
      }[];
    }[];
    blocks: {
      [key: string]: any[];
    };
    variables: {
      [key: string]: { global: boolean; owner: number };
    };
    broadcasts: { id: number; name: string }[];
  };
};

type LessonCostume = {
  costumeName: string;
  truePath: string;
};

function lessonSprite(
  id: number,
  name: string,
  costumes: LessonCostume[],
): Lesson["baseState"]["sprites"][number] {
  return {
    id,
    name,
    x: 0,
    y: 0,
    image_paths: costumes.map((costume) => ({
      costumeName: costume.costumeName,
      loadablePath: null,
      truePath: costume.truePath,
    })),
  };
}

function lessonBaseState(
  sprites: Lesson["baseState"]["sprites"],
  broadcasts: { id: number; name: string }[] = [],
): Lesson["baseState"] {
  return {
    sprites,
    blocks: Object.fromEntries(
      sprites.map((sprite) => [String(sprite.id), []]),
    ),
    variables: {},
    broadcasts,
  };
}

function createLesson(
  id: number,
  name: string,
  description: string,
  longDescription: string,
  allowedBlocks: string[] | string[][],
  instructions: string[],
  blocksToHighlight: string[][],
  difficulty: "beginner" | "intermediate" | "advanced",
  successMetrics: any[],
  sprites: Lesson["baseState"]["sprites"],
  broadcasts: { id: number; name: string }[] = [],
): Lesson {
  return {
    id,
    name,
    description,
    longDescription,
    allowedBlocks,
    instructions,
    blocksToHighlight,
    successMetrics,
    difficulty,
    baseState: lessonBaseState(sprites, broadcasts),
  };
}
const hero = lessonSprite(1, "Monster", [
  {
    costumeName: "monster1",
    truePath: "lesson_assets/shared/Frank-a.svg",
  },
]);
function stageMaker(bgId: number = 0) {
  let suffix = bgId === 1 ? ".svg" : ".png";
  return lessonSprite(-1, "Stage", [
    {
      costumeName: `backdrop${bgId}`,
      truePath: `lesson_assets/shared/bg${bgId}${suffix}`,
    },
  ]);
}
const stage1 = stageMaker(1);
const stage0 = stageMaker(0);
const stage2 = stageMaker(2);
const stage3 = stageMaker(3);
const whenStartedBlock = "events_when_started";

export const moveLesson = createLesson(
  0,
  "Move the sprite",
  "Make the sprite move when the green flag is clicked.",
  "This lesson will teach you how to make a sprite move when the green flag is clicked. You will use blocks from the Events and Motion categories to create the movement.",
  [
    "events_when_started",
    "screen_change_x",
    "screen_change_y",
    "screen_hide",
    "screen_show",
    "screen_set_x",
    "screen_set_y",
  ],
  [
    `Let's make the sprite move when the start button is pressed. Drag a "When Started" block from the Events category.`,
    'Drag a "change x by" block from the Motion category. Connect it under the "When Started" block.',
    'Press "Run Code", or go to the Screen tab and press "Run Code", to see the sprite move from the center!',
    "Great job! The sprite moved. You have completed this lesson.",
  ],
  [["events_when_started"], ["screen_change_x"], [], []],
  "beginner",
  [
    {
      check: "exists",
      blockType: "events_when_started",
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_change_x",
      },
    },
    {
      check: "codeRan",
    },
  ],
  [stage0, hero],
  [],
);

export const positionLesson = createLesson(
  1,
  "Place and Turn",
  "Learn to place a sprite and turn it.",
  "This lesson will teach you how to place a sprite on the screen and turn it. You will use blocks from the Events and Motion categories to create the placement and rotation.",
  [
    whenStartedBlock,
    "screen_set_position",
    "screen_set_x",
    "screen_set_y",
    "screen_rotate_clockwise",
    "screen_rotate_counterclockwise",
    "screen_set_rotation",
    "screen_position_x",
    "screen_position_y",
    "math_number",
  ],
  [
    'Drag a "when started" block into the workspace.',
    'Now drag a "set position x y" block and connect it under the "when started" block.',
    "Set the x value to 600 and the y value to 200. This will place the sprite in the lower right corner of the screen.",
    'Add a "rotate ↻" block below the "set position" block. This will rotate the sprite clockwise by a default of 15 degrees.',
    `Press Run Code, or go to the Screen tab and press Run Code.`,
    "Congratulations! You have completed the lesson.",
  ],
  [
    ["events_when_started"],
    ["screen_set_position"],
    [],
    ["screen_rotate_clockwise"],
    [],
    [],
  ],
  "beginner",
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "screen_set_position" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_set_position",
        inputs: {
          X: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 600 },
          },
          Y: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 200 },
          },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_set_position",
        next: { check: "exists", blockType: "screen_rotate_clockwise" },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage1],
);

export const loopLesson = createLesson(
  2,
  "Repeat a Movement",
  "Learn how a loop repeats the same action.",
  "This lesson will teach you how to use a loop to repeat the same action multiple times. You will use blocks from the Control and Motion categories to create the loop and the repeated action.",
  [
    whenStartedBlock,
    "controls_repeat_ext",
    "controls_forever",
    "logic_wait",
    "screen_change_x",
    "screen_change_y",
    "math_number",
  ],
  [
    'Drag a "when started" block.',
    'Place a "repeat" block under the "when started" block.',
    'Place a "change x" block inside the "repeat" block.',
    'Set the repeat number to 5 inside the "repeat" block. This will make the sprite change its x position 5 times.',
    "Press Run Code, or go to the Screen tab and press Run Code.",
    "Well done! You have completed the lesson.",
  ],
  [
    ["events_when_started"],
    ["controls_repeat_ext"],
    ["screen_change_x"],
    ["math_number"],
    [],
    [],
  ],
  "beginner",
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "controls_repeat_ext" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_repeat_ext",
        inputs: { DO: { check: "exists", blockType: "screen_change_x" } },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_repeat_ext",
        inputs: {
          TIMES: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 5 },
          },
          DO: { check: "exists", blockType: "screen_change_x" },
        },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage3],
);

export const decisionLesson = createLesson(
  3,
  "Make a Choice",
  "Learn to use a condition to decide what a sprite does.",
  "This lesson will teach you how to use a condition to decide what a sprite does. You will use blocks from the Control and Sensing categories to create the condition and the actions based on that condition.",
  [
    whenStartedBlock,
    "controls_if",
    "logic_compare",
    "logic_operation",
    "logic_negate",
    "controls_forever",
    "controls_repeat_ext",
    "logic_boolean",
    "logic_touching",
    "logic_key_down",
    "screen_change_x",
    "screen_change_y",
    "screen_glide_preset",
    "math_number",
  ],
  [
    'Drag a "When Started" block into the workspace',
    'Next, drag a "forever" block and connect it under the "When Started" block.',
    'Drag an "If" block and connect it inside the "forever" block.',
    'Put a "touching" question into the "If" block. Set it to check if the sprite is touching the mouse pointer.',
    'Put a "glide to mouse-pointer" block inside the "If" block. Change the mouse-pointer to "random position".',
    "Press Run Code, or go to the Screen tab and press Run Code.",
    "Great job! You have completed the lesson. Hover the mouse pointer over the sprite to see it glide to a random position.",
  ],
  [
    ["events_when_started"],
    ["controls_forever"],
    ["controls_if"],
    ["logic_touching"],
    ["screen_glide_preset"],
    [],
    [],
  ],
  "intermediate",
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "controls_forever" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_forever",
        inputs: { DO: { check: "exists", blockType: "controls_if" } },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_forever",
        inputs: {
          DO: {
            check: "exists",
            blockType: "controls_if",
            inputs: {
              IF0: {
                check: "exists",
                blockType: "logic_touching",
                fields: { TOUCHING: "MOUSE_POINTER" },
              },
            },
          },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_forever",
        inputs: {
          DO: {
            check: "exists",
            blockType: "controls_if",
            inputs: {
              IF0: {
                check: "exists",
                blockType: "logic_touching",
                fields: { TOUCHING: "MOUSE_POINTER" },
              },
              DO0: {
                check: "exists",
                blockType: "screen_glide_preset",
                fields: { GLIDE_PRESET: "RANDOM_POSITION" },
              },
            },
          },
        },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage2],
);

export const textLesson = createLesson(
  4,
  "Say and Think",
  "Learn to show a message in a speech or thought bubble.",
  "This lesson will teach you how to display messages in speech or thought bubbles. You will use blocks from the Events and Screen categories to create the bubbles.",
  [
    whenStartedBlock,
    "screen_say",
    "screen_think",
    "screen_clear_speech_bubbles",
    "text",
    "text_join",
    "math_number",
  ],
  [
    'Drag a "When Started" block.',
    'Connect a "say" block under the "When Started" block. Type anything you want in the "say" block.',
    'Connect a "think" block after the "say" block. Type anything you want in the "think" block.',
    "Press Run Code, or go to the Screen tab and press Run Code, to see both bubbles show one after another.",
    "Congratulations! You have completed the lesson.",
  ],
  [["events_when_started"], ["screen_say"], ["screen_think"], [], []],
  "beginner",
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "screen_say" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_say",
        next: { check: "exists", blockType: "screen_think" },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage3],
);

export const costumeLesson = createLesson(
  5,
  "Animate Costumes",
  "Learn that one sprite can have more than one costume.",
  "This lesson will teach you how to animate a sprite by changing its costumes. You will use blocks from the Events, Visual, and Screen categories to create the animation.",
  [
    whenStartedBlock,
    "screen_next_costume",
    "screen_set_costume",
    "screen_say",
    "logic_wait",
    "controls_repeat_ext",
    "math_number",
  ],
  [
    'Use the sprite selector to look at the two costumes named Idle and Happy. Then, Drag a "When Started" block.',
    'Connect a "Repeat" block under the "When Started" block.',
    'Place a "next costume" block inside the "Repeat" block.',
    'Place a "wait" block inside the "Repeat" block after the "next costume" block. Set the wait time to 1 second.',
    'Set the "Repeat" block to 2 times.',
    "Press Run Code, or go to the Screen tab and press Run Code, to see the costume change twice.",
    "Congratulations! You have completed the lesson.",
  ],
  [
    ["events_when_started"],
    ["controls_repeat_ext"],
    ["screen_next_costume"],
    ["logic_wait"],
    ["math_number"],
    [],
    [],
  ],
  "intermediate",
  [
    { check: "exists", blockType: whenStartedBlock },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "controls_repeat_ext" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_repeat_ext",
        inputs: { DO: { check: "exists", blockType: "screen_next_costume" } },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_repeat_ext",
        inputs: {
          DO: {
            check: "exists",
            blockType: "screen_next_costume",
            next: { check: "exists", blockType: "logic_wait" },
          },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "controls_repeat_ext",
        inputs: {
          TIMES: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 2 },
          },
        },
      },
    },
    { check: "codeRan" },
  ],
  [
    lessonSprite(1, "Hero", [
      { costumeName: "Idle", truePath: "lesson_assets/shared/hero-idle.svg" },
      { costumeName: "Happy", truePath: "lesson_assets/shared/hero-happy.svg" },
    ]),
    stage1,
  ],
);

export const appearanceLesson = createLesson(
  6,
  "Show, Hide, and Resize",
  "Learn to change whether a sprite is visible and how large it is.",
  "This lesson will teach you how to change whether a sprite is visible and how large it is. You will use blocks from the Events, Screen, and Visual categories to create the visibility and size changes.",
  [
    whenStartedBlock,
    "screen_show",
    "logic_wait",
    "screen_hide",
    "screen_set_size",
    "screen_change_size",
    "screen_say",
    "math_number",
  ],
  [
    'Drag a "When Started" block.',
    'Connect a "hide" block under the "When Started" block.',
    'Add a "wait" block after the "hide" block. Then, connect a "show" block after the "hide" block.',
    'Connect a "set size" block after the "show" block. Set the size to 50%.',
    "Press Run Code, or go to the Screen tab and press Run Code, to watch the sprite change.",
    "Congratulations! You have completed the lesson. Try adjusting the size to see how the sprite changes.",
  ],
  [
    ["events_when_started"],
    ["screen_hide"],
    ["logic_wait", "screen_show"],
    ["screen_set_size"],
    [],
    [],
  ],
  "intermediate",
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "screen_hide" },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_hide",
        next: {
          check: "exists",
          blockType: "logic_wait",
          next: { check: "exists", blockType: "screen_show" },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_hide",
        next: {
          check: "exists",
          blockType: "logic_wait",
          next: {
            check: "exists",
            blockType: "screen_show",
            next: {
              check: "exists",
              blockType: "screen_set_size",
              inputs: {
                SIZE_SET: {
                  check: "exists",
                  blockType: "math_number",
                  fields: { NUM: 50 },
                },
              },
            },
          },
        },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage0],
);

export const localVariableLesson = createLesson(
  7,
  "Remember a Score",
  "Learn to create and use a local variable on one sprite.",
  "This lesson will teach you how to create and use a local variable on one sprite. You will use blocks from the Events, Variables, and Motion categories to create the variable and manipulate its value.",
  [
    whenStartedBlock,
    "variables_set",
    "variables_get",
    "math_change",
    "screen_say",
    "math_number",
    "text",
  ],
  [
    "Select the Monster sprite and create a variable named score. Keep the score variable local (this sprite only).",
    'Drag a "When Started" block.',
    'Connect a "set score" block under the "When Started" block. Add a "number" block to the empty slot. Set the value to 50.',
    'Connect a "change score by" block after the "set score" block. Set the change amount to 55.',
    'Connect a "say" block after the "change score" block. Put score in the "say" block.',
    "Press Run Code, or go to the Screen tab and press Run Code.",
    "Congratulations! You have completed the lesson. Sprites can only read and use their own local variables.",
  ],
  [
    [],
    ["events_when_started"],
    ["variables_set"],
    ["math_change"],
    ["screen_say", "variables_get"],
    [],
    [],
  ],
  "intermediate",
  [
    { check: "variable", name: "score", spriteId: 1, global: false },
    { check: "exists", blockType: whenStartedBlock },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "variables_set",
        fields: { VAR: "score" },
        inputs: {
          VALUE: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 50 },
          },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "variables_set",
        fields: { VAR: "score" },
        inputs: {
          VALUE: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 50 },
          },
        },
        next: {
          check: "exists",
          blockType: "math_change",
          fields: { VAR: "score" },
          inputs: {
            DELTA: {
              check: "exists",
              blockType: "math_number",
              fields: { NUM: 55 },
            },
          },
        },
      },
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "variables_set",
        fields: { VAR: "score" },
        inputs: {
          VALUE: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 50 },
          },
        },
        next: {
          check: "exists",
          blockType: "math_change",
          fields: { VAR: "score" },
          inputs: {
            DELTA: {
              check: "exists",
              blockType: "math_number",
              fields: { NUM: 55 },
            },
          },
          next: {
            check: "exists",
            blockType: "screen_say",
            inputs: {
              MESSAGE: {
                check: "exists",
                blockType: "variables_get",
                fields: { VAR: "score" },
              },
            },
          },
        },
      },
    },
    { check: "codeRan" },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/Friend-a.svg" },
    ]),
    stage0,
  ],
);

export const globalVariableLesson = createLesson(
  8,
  "Share a Location",
  "Learn the difference between local and global variables with two sprites.",
  "This lesson will teach you the difference between local and global variables with two sprites. You will use blocks from the Events, Variables, and Motion categories to create and manipulate a global variable that can be accessed by both sprites.",
  [
    whenStartedBlock,
    "variables_set",
    "variables_get",
    "screen_set_position",
    "screen_set_x",
    "screen_set_y",
    "math_change",
    "screen_say",
    "events_when_sprite_clicked",
    "math_number",
    "text",
  ],
  [
    "Select the Monster sprite and create a variable named ypos. Mark the ypos variable global (all sprites).",
    'On the Monster sprite, drag a "When Started" block into the workspace. Drag a "set ypos" block under the "When Started" block. Set ypos to 500.',
    'On the Friend sprite, drag a "When Started" block into the workspace. Drag a "set position y" block under the "When Started" block. Set y to ypos.',
    "Press Run Code, or go to the Screen tab and press Run Code, to see that both sprites can read and use the ypos variable.",
    "Congratulations! You have completed the lesson. Global variables can be read and used by all sprites, while local variables can only be read and used by the sprite that created them.",
  ],
  [
    [],
    ["events_when_started", "variables_set"],
    ["events_when_started", "screen_set_y", "variables_get"],
    [],
    [],
  ],
  "advanced",
  [
    { check: "variable", name: "ypos", spriteId: 1, global: true },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "variables_set",
        fields: { VAR: "ypos" },
        inputs: {
          VALUE: {
            check: "exists",
            blockType: "math_number",
            fields: { NUM: 500 },
          },
        },
      },
      spriteId: 1,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_set_y",
        inputs: {
          Y: {
            check: "exists",
            blockType: "variables_get",
            fields: { VAR: "ypos" },
          },
        },
      },
      spriteId: 2,
    },
    { check: "codeRan" },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/Friend-a.svg" },
    ]),
    stage0,
  ],
);

export const broadcastLesson = createLesson(
  9,
  "Send a Message",
  "Learn how sprites can work together with a broadcast.",
  "This lesson will teach you how sprites can work together with a broadcast. You will use blocks from the Events, Screen, and Motion categories to create a broadcast that triggers an action in another sprite.",
  [
    whenStartedBlock,
    "events_broadcast",
    "events_when_broadcast_received",
    "screen_say",
    "screen_change_x",
    "text",
  ],
  [
    'Click on the dropdown menu on the "broadcast" block in the toolbox. Press "New Message...". Create a broadcast named "start dance".',
    'On the Monster sprite, add a "When Started" block.',
    'Connect a "broadcast" block under the "When Started" block. Set it to broadcast start dance.',
    'On the Friend sprite, add a "When I Receive" block. Set it to start dance.',
    'Connect a "say" block under the "When I Receive" block.',
    "Press Run Code, or go to the Screen tab and press Run Code.",
    "Congratulations! You have completed the lesson. Sprites can communicate with each other using broadcasts and coordinate actions.",
  ],
  [
    ["events_broadcast"],
    ["events_when_started"],
    ["events_broadcast"],
    ["events_when_broadcast_received"],
    ["screen_say"],
    [],
    [],
  ],
  "advanced",
  [
    { check: "broadcast", name: "start dance" },
    {
      check: "exists",
      blockType: whenStartedBlock,
      spriteId: 1,
    },
    {
      check: "exists",
      blockType: whenStartedBlock,
      spriteId: 1,
      next: {
        check: "exists",
        blockType: "events_broadcast",
        fields: { BROADCAST: "start dance" },
      },
    },
    {
      check: "exists",
      blockType: "events_when_broadcast_received",
      fields: { BROADCAST: "start dance" },
      spriteId: 2,
    },
    {
      check: "exists",
      blockType: "events_when_broadcast_received",
      fields: { BROADCAST: "start dance" },
      next: { check: "exists", blockType: "screen_say" },
      spriteId: 2,
    },
    { check: "codeRan" },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/hero-idle.svg" },
    ]),
    stage0,
  ],
  [],
);
const difficultyWeight = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const builtInLessons: Lesson[] = [
  moveLesson,
  positionLesson,
  loopLesson,
  decisionLesson,
  textLesson,
  costumeLesson,
  appearanceLesson,
  localVariableLesson,
  globalVariableLesson,
  broadcastLesson,
].sort(
  (a, b) => difficultyWeight[a.difficulty] - difficultyWeight[b.difficulty],
);
