import { Block } from "./block";

export class StackFrame {
  _body: Block[];
  _position: number;

  constructor(body: Block[]) {
    this._body = body;
    this._position = 0;
  }
}

export class RepeatFrame extends StackFrame {
  _times: number;
  _currentCount: number;

  constructor(times: number, body: Block[]) {
    super(body);
    this._times = times;
    this._currentCount = 0;
  }

  incrementCount() {
    this._currentCount++;
  }

  hasMoreIterations(): boolean {
    return this._currentCount < this._times;
  }
}
