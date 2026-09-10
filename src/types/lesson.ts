export type Lesson = {
  id: number;
  name: string;
  description: string;
  allowedBlocks: string[][];
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

export const moveLesson: Lesson = {
  id: 0,
  name: "Move the sprite",
  description: "Make the sprite move when the green flag is clicked.",
  allowedBlocks: [
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
      "events_when_started",
      "screen_change_x",
      "screen_change_y",
      "screen_hide",
      "screen_show",
      "screen_set_x",
      "screen_set_y",
    ],
    [],
  ],
  instructions: [
    "Let's make the sprite move when the start button is pressed. Drag a 'When Started' block from the Events category and a 'change x by' block from the Motion category. Connect them together.",
    'Go to the "Screen" tab and press "Run Code" to see the sprite move from the center!',
    "Great job! The sprite moved",
  ],
  successMetrics: [
    {
      check: "exists",
      blockType: "events_when_started",
      next: {
        check: "exists",
        blockType: "screen_change_x",
      },
    },
    {
      check: "predicate",
      expression: "target.x !== 400 || target.y !== 300",
    },
  ],
  baseState: {
    sprites: [
      {
        id: 1,
        name: "Sprite1",
        x: 0,
        y: 0,
        image_paths: [
          {
            costumeName: "costume1",
            loadablePath: null,
            truePath: "lesson_assets/lesson1/Frank-a.svg",
          },
        ],
      },
      {
        id: -1,
        name: "Stage",
        x: 0,
        y: 0,
        image_paths: [
          {
            costumeName: "backdrop1",
            loadablePath: null,
            truePath: "lesson_assets/lesson1/bg.png",
          },
        ],
      },
    ],
    blocks: {
      "1": [],
      "-1": [],
    },
    variables: {},
    broadcasts: [],
  },
};
