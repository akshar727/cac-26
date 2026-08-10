export type Block =
  | {
      type: "canvas_rect";
      color: string;
      xPos: number;
      yPos: number;
      width: number;
      height: number;
    }
  | {
      type: "draw_text";
      text: string;
      font: string;
      color: string;
      fontSize: number;
      xPos: number;
      yPos: number;
    }
  | {
      type: "set_position";
      x: number;
      y: number;
    }
  | {
      type: "set_x";
      x: number;
    }
  | {
      type: "set_y";
      y: number;
    }
  | {
      type: "wait";
      duration: number;
    };
