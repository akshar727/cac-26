export type Lesson = {
  id: number;
  name: string;
  description: string;
  allowedBlocks: string[][];
  instructions: string[];
  successMetrics: string[];
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
  allowedBlocks: [["events_when_started", "screen_move"]],
  instructions: [
    "Let's make the sprite move when the start button is pressed. Drag a 'when started' block from the Events category and a 'move' block from the Motion category. Connect them together.",
  ],
  successMetrics: ["target.x !== 0 || target.y !== 0"],
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
