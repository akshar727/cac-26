export type Lesson = {
  id: number;
  name: string;
  description: string;
  allowedBlocks: string[] | string[][];
  instructions: string[];
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
  allowedBlocks: string[] | string[][],
  instructions: string[],
  successMetrics: any[],
  sprites: Lesson["baseState"]["sprites"],
  broadcasts: { id: number; name: string }[] = [],
): Lesson {
  return {
    id,
    name,
    description,
    allowedBlocks,
    instructions,
    successMetrics,
    baseState: lessonBaseState(sprites, broadcasts),
  };
}
const hero = lessonSprite(1, "Monster", [
  {
    costumeName: "monster1",
    truePath: "lesson_assets/shared/Frank-a.svg",
  },
]);
const stage = lessonSprite(-1, "Stage", [
  {
    costumeName: "backdrop1",
    truePath: "lesson_assets/shared/bg.png",
  },
]);
const whenStartedBlock = "events_when_started";
export const moveLesson = createLesson(
  0,
  "Move the sprite",
  "Make the sprite move when the green flag is clicked.",
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
    "Let's make the sprite move when the start button is pressed. Drag a 'When Started' block from the Events category.",
    "Drag a 'change x by' block from the Motion category. Connect it under the 'When Started' block.",
    'Go to the "Screen" tab and press "Run Code" to see the sprite move from the center!',
    "Great job! The sprite moved. You have completed this lesson.",
  ],
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
  [stage, hero],
  [],
);

export const positionLesson = createLesson(
  1,
  "Place and Turn",
  "Learn to place a sprite and turn it.",
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
    "Drag a when started block into the workspace.",
    "Now drag a 'set position x y' block and connect it under the when started block.",
    "Add a 'rotate ↻' block below the set position block.",
    `Go to the "Screen" tab and press Run Code.`,
    "Congratulations! You have completed the lesson.",
  ],
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
        next: { check: "exists", blockType: "screen_rotate_clockwise" },
      },
    },
    { check: "codeRan" },
  ],
  [hero, stage],
);

export const loopLesson = createLesson(
  2,
  "Repeat a Movement",
  "Learn how a loop repeats the same action.",
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
    "Drag a when started block.",
    "Place a repeat block under it",
    "Place a change x block inside the repeat block.",
    "Set the repeat number to 5 inside the repeat block.",
    "Go to the Screen tab and press Run Code.",
    "Well done! You have completed the lesson.",
  ],
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
  [hero, stage],
);

export const decisionLesson = createLesson(
  3,
  "Make a Choice",
  "Learn to use a condition to decide what a sprite does.",
  [
    whenStartedBlock,
    "controls_if",
    "logic_compare",
    "logic_operation",
    "logic_negate",
    "logic_boolean",
    "logic_touching",
    "logic_key_down",
    "screen_change_x",
    "screen_change_y",
    "math_number",
  ],
  [
    "Drag a When Started block and an If block.",
    "Put a touching or key down question into the If block.",
    "Put a change x block inside the If block. Test the program by pressing Run Code.",
  ],
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "controls_if" },
    },
    { check: "blockCount", minimum: 3 },
    { check: "blockCount", minimum: 4 },
  ],
  [hero, stage],
);

export const textLesson = createLesson(
  4,
  "Say and Think",
  "Learn to show a message in a speech or thought bubble.",
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
    "Drag a When Started block.",
    "Connect a say block and type a short greeting.",
    "Add a think block after it. Run the program and read both bubbles.",
  ],
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_say",
        next: { check: "exists", blockType: "screen_think" },
      },
    },
    { check: "blockCount", minimum: 3 },
    { check: "blockCount", minimum: 3 },
  ],
  [hero, stage],
);

export const costumeLesson = createLesson(
  5,
  "Animate Costumes",
  "Learn that one sprite can have more than one costume.",
  [
    whenStartedBlock,
    "screen_next_costume",
    "screen_set_costume",
    "screen_say",
    "logic_wait",
    "controls_repeat_ext",
  ],
  [
    "Use the sprite selector to look at the two costumes named Idle and Happy.",
    "Drag a When Started block and connect a next costume block.",
    "Add a Repeat block so the costume changes more than once. Run the program.",
  ],
  [
    { check: "costumeCount", spriteId: 1, minimum: 2 },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "screen_next_costume" },
    },
    { check: "blockCount", minimum: 3 },
  ],
  [
    lessonSprite(1, "Hero", [
      { costumeName: "Idle", truePath: "lesson_assets/shared/hero-idle.svg" },
      { costumeName: "Happy", truePath: "lesson_assets/shared/hero-happy.svg" },
    ]),
    stage,
  ],
);

export const appearanceLesson = createLesson(
  6,
  "Show, Hide, and Resize",
  "Learn to change whether a sprite is visible and how large it is.",
  [
    whenStartedBlock,
    "screen_show",
    "screen_hide",
    "screen_set_size",
    "screen_change_size",
    "screen_say",
    "math_number",
  ],
  [
    "Drag a When Started block.",
    "Connect a hide block, then a wait block is not needed: connect a show block next.",
    "Add a set size block and choose 50. Run the program and watch the sprite change.",
  ],
  [
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: {
        check: "exists",
        blockType: "screen_hide",
        next: { check: "exists", blockType: "screen_show" },
      },
    },
    { check: "blockCount", minimum: 3 },
    { check: "blockCount", minimum: 4 },
  ],
  [hero, stage],
);

export const localVariableLesson = createLesson(
  7,
  "Remember a Score",
  "Learn to create and use a local variable on one sprite.",
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
    "Select the Hero sprite and create a variable named score. Keep it local.",
    "Drag a When Started block and set score to 0.",
    "Add a change score by 1 block and use score in a say block. Run the program.",
  ],
  [
    { check: "variable", name: "score", global: false },
    {
      check: "exists",
      blockType: whenStartedBlock,
      next: { check: "exists", blockType: "variables_set" },
    },
    { check: "blockCount", minimum: 4 },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/friend.svg" },
    ]),
    stage,
  ],
);

export const globalVariableLesson = createLesson(
  8,
  "Share a Score",
  "Learn the difference between local and global variables with two sprites.",
  [
    whenStartedBlock,
    "variables_set",
    "variables_get",
    "math_change",
    "screen_say",
    "events_when_sprite_clicked",
    "math_number",
    "text",
  ],
  [
    "Select the Hero sprite and create a variable named points. Mark it global.",
    "Select the Friend sprite and create a local variable named messageCount.",
    "Make both sprites use points. Run the program and check that both sprites can read the shared value.",
  ],
  [
    { check: "spriteCount", minimum: 2 },
    { check: "variable", name: "points", global: true },
    { check: "variable", name: "messageCount", global: false },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/friend.svg" },
    ]),
    stage,
  ],
);

export const broadcastLesson = createLesson(
  9,
  "Send a Message",
  "Learn how sprites can work together with a broadcast.",
  [
    whenStartedBlock,
    "events_broadcast",
    "events_when_broadcast_received",
    "screen_say",
    "screen_change_x",
    "text",
  ],
  [
    "Use the message menu to create a broadcast named start dance.",
    "On the Hero sprite, add When Started and broadcast start dance.",
    "On the Friend sprite, add When I Receive start dance and make it say Ready.",
  ],
  [
    { check: "broadcast", name: "start dance" },
    { check: "spriteCount", minimum: 2 },
    { check: "blockCount", minimum: 2 },
  ],
  [
    hero,
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/friend.svg" },
    ]),
    stage,
  ],
  [],
);

export const sceneLesson = createLesson(
  10,
  "Build a Small Scene",
  "Use several sprites, costumes, and a backdrop to make a scene.",
  [
    whenStartedBlock,
    "events_when_sprite_clicked",
    "screen_set_costume",
    "screen_next_costume",
    "screen_set_position",
    "screen_say",
    "screen_show",
    "screen_hide",
    "math_number",
  ],
  [
    "Look at the Stage backdrop and the two sprites. Each sprite has two costumes.",
    "Place the Hero on the left and the Friend on the right using set position blocks.",
    "Make one sprite say a greeting when it is clicked. Change its costume too.",
  ],
  [
    { check: "spriteCount", minimum: 2 },
    { check: "costumeCount", spriteId: 1, minimum: 2 },
    { check: "costumeCount", spriteId: 2, minimum: 2 },
  ],
  [
    lessonSprite(1, "Hero", [
      { costumeName: "Blue", truePath: "lesson_assets/shared/hero-blue.svg" },
      { costumeName: "Red", truePath: "lesson_assets/shared/hero-red.svg" },
    ]),
    lessonSprite(2, "Friend", [
      { costumeName: "Calm", truePath: "lesson_assets/shared/friend-calm.svg" },
      {
        costumeName: "Excited",
        truePath: "lesson_assets/shared/friend-excited.svg",
      },
    ]),
    lessonSprite(-1, "Stage", [
      { costumeName: "Park", truePath: "lesson_assets/shared/park.png" },
    ]),
  ],
);

const summativeBlocks = [
  "controls_if",
  "controls_repeat_ext",
  "controls_whileUntil",
  "controls_for",
  "controls_forever",
  "controls_flow_statements",
  "logic_compare",
  "logic_operation",
  "logic_negate",
  "logic_boolean",
  "logic_null",
  "logic_ternary",
  "logic_wait",
  "logic_touching",
  "logic_key_down",
  "logic_mouse_down",
  "math_number",
  "math_arithmetic",
  "math_single",
  "math_trig",
  "math_constant",
  "math_number_property",
  "math_round",
  "math_on_list",
  "math_modulo",
  "math_constrain",
  "math_random_int",
  "math_random_float",
  "math_atan2",
  "text",
  "text_join",
  "text_append",
  "text_length",
  "text_isEmpty",
  "text_charAt",
  "text_changeCase",
  "text_trim",
  "text_count",
  "text_replace",
  "text_reverse",
  "events_when_started",
  "events_when_key_pressed",
  "events_when_sprite_clicked",
  "events_broadcast",
  "events_when_broadcast_received",
  "screen_set_position",
  "screen_set_x",
  "screen_set_y",
  "screen_change_x",
  "screen_change_y",
  "screen_rotate_clockwise",
  "screen_rotate_counterclockwise",
  "screen_set_rotation",
  "screen_rotation",
  "screen_next_costume",
  "screen_set_costume",
  "screen_show",
  "screen_hide",
  "screen_set_size",
  "screen_change_size",
  "screen_glide",
  "screen_glide_preset",
  "screen_say",
  "screen_think",
  "screen_clear_speech_bubbles",
  "screen_distance_to",
  "screen_position_x",
  "screen_position_y",
  "screen_height",
  "screen_width",
  "screen_sprite_size",
  "screen_mouse_x",
  "screen_mouse_y",
  "variables_set",
  "variables_get",
  "math_change",
];

export const summativeLesson = createLesson(
  11,
  "Codely Adventure",
  "Create a small interactive story using the skills from every lesson.",
  summativeBlocks,
  [
    "Use at most 30 blocks. Start with When Started and create a variable named score.",
    "Use two sprites. Make the Hero move and change costume. Make the Friend react when clicked.",
    "Use a broadcast named scene ready so one sprite can tell the other sprite what to do.",
    "Add one condition and one loop. Make the sprites say something that helps the story make sense.",
    "Run the story. Check that the sprites, costumes, variable, condition, loop, and broadcast all work together.",
  ],
  [
    { check: "blockCount", minimum: 3 },
    { check: "spriteCount", minimum: 2 },
    { check: "variable", name: "score" },
    { check: "broadcast", name: "scene ready" },
    { check: "blockCount", minimum: 8 },
  ],
  [
    lessonSprite(1, "Hero", [
      { costumeName: "Hero", truePath: "lesson_assets/shared/hero.svg" },
      {
        costumeName: "Hero Jump",
        truePath: "lesson_assets/shared/hero-jump.svg",
      },
    ]),
    lessonSprite(2, "Friend", [
      { costumeName: "Friend", truePath: "lesson_assets/shared/friend.svg" },
      {
        costumeName: "Friend Wave",
        truePath: "lesson_assets/shared/friend-wave.svg",
      },
    ]),
    lessonSprite(-1, "Stage", [
      {
        costumeName: "Story World",
        truePath: "lesson_assets/shared/story-world.png",
      },
    ]),
  ],
  [],
);

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
  sceneLesson,
  summativeLesson,
];
