import { Procedure, ProcedureCallArgument, Value } from "@/types/field";
import { IntermediateBlock } from "../types/intermediateBlock";

export class StackFrame {
  _body: IntermediateBlock[];
  _position: number;
  _finished = false;

  constructor(body: IntermediateBlock[]) {
    this._body = body;
    this._position = 0;
  }

  markComplete() {
    this._finished = true;
  }

  isComplete(): boolean {
    return this._finished;
  }
}

export class RepeatFrame extends StackFrame {
  _times: number;
  _currentCount: number;

  constructor(times: number, body: IntermediateBlock[]) {
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

export class IfFrame extends StackFrame {}

export class RepeatWhileUntilFrame extends StackFrame {
  _condition: any;
  _mode: "WHILE" | "UNTIL";

  constructor(
    condition: any,
    body: IntermediateBlock[],
    mode: "WHILE" | "UNTIL",
  ) {
    super(body);
    this._condition = condition;
    this._mode = mode;
  }
}

export class ForFrame extends StackFrame {
  _variableName: string;
  _startValue: number;
  _endValue: number;
  _stepValue: number;
  _currentValue: number;

  constructor(
    variableName: string,
    startValue: number,
    endValue: number,
    stepValue: number,
    body: IntermediateBlock[],
  ) {
    super(body);
    this._variableName = variableName;
    this._startValue = startValue;
    this._endValue = endValue;
    this._stepValue = stepValue;
    this._currentValue = startValue;
  }

  increment() {
    this._currentValue += this._stepValue;
  }

  hasMoreIterations(): boolean {
    if (this._stepValue > 0) {
      return this._currentValue <= this._endValue;
    } else {
      return this._currentValue >= this._endValue;
    }
  }
}

export class ProcedureFrameNoReturn extends StackFrame {
  _procedure: Procedure;
  _arguments: ProcedureCallArgument[] | { name: string; value: Value }[];
  _pendingEvaluation: any = null;

  constructor(procedure: Procedure, args: ProcedureCallArgument[]) {
    super(procedure.body);
    this._procedure = procedure;
    this._arguments = args;
  }
}

export class ForeverFrame extends StackFrame {
  constructor(body: IntermediateBlock[]) {
    super(body);
  }
}

export class GlideFrame extends StackFrame {
  _startX: number;
  _startY: number;
  _targetX: number;
  _targetY: number;
  _startTime: number;
  _endTime: number;
  _currentTime: number;
  _cancelled = false;

  constructor(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    currentTime: number,
    endTime: number,
  ) {
    super([]);
    this._startX = startX;
    this._startY = startY;
    this._targetX = targetX;
    this._targetY = targetY;
    this._startTime = currentTime;
    this._endTime = endTime;
    this._currentTime = currentTime;
  }

  updateElapsedTime(newTime: number) {
    this._currentTime = newTime;
  }

  cancel() {
    this._cancelled = true;
  }

  getPosition(): { x: number; y: number } {
    const duration = this._endTime - this._startTime;
    const progress =
      duration <= 0
        ? 1
        : Math.min(
            1,
            Math.max(0, (this._currentTime - this._startTime) / duration),
          );

    return {
      x: this._startX + (this._targetX - this._startX) * progress,
      y: this._startY + (this._targetY - this._startY) * progress,
    };
  }

  isComplete(): boolean {
    return this._cancelled || this._currentTime >= this._endTime;
  }
}
