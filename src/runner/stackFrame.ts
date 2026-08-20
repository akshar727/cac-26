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
  _targetX: number;
  _targetY: number;
  _endTime: number;
  _currentTime: number;

  constructor(
    targetX: number,
    targetY: number,
    currentTime: number,
    endTime: number,
  ) {
    super([]);
    this._targetX = targetX;
    this._targetY = targetY;
    this._endTime = endTime;
    this._currentTime = currentTime;
  }

  updateElapsedTime(newTime: number) {
    this._currentTime = newTime;
  }

  getDxDy(
    currentX: number,
    currentY: number,
    deltaTime: number,
  ): { dx: number; dy: number } {
    const remainingTime = this._endTime - this._currentTime;

    if (remainingTime <= 0) {
      return { dx: 0, dy: 0 };
    }
    const dt = Math.min(deltaTime, remainingTime);
    let dx = ((this._targetX - currentX) / (remainingTime / 1000)) * dt;
    let dy = ((this._targetY - currentY) / (remainingTime / 1000)) * dt;
    const nextX = currentX + dx;
    const nextY = currentY + dy;
    const reachedX = (this._targetX - currentX) * (this._targetX - nextX) <= 0;
    const reachedY = (this._targetY - currentY) * (this._targetY - nextY) <= 0;

    return {
      dx: reachedX ? this._targetX - currentX : dx,
      dy: reachedY ? this._targetY - currentY : dy,
    };
  }

  isComplete(): boolean {
    return this._currentTime >= this._endTime;
  }
}
