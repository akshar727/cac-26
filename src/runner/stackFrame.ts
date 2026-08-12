import { Procedure, ProcedureCallArgument, Value } from "@/types/field";
import { Block } from "../types/block";

export class StackFrame {
  _body: Block[];
  _position: number;
  _finished = false;

  constructor(body: Block[]) {
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

export class IfFrame extends StackFrame {}

export class RepeatWhileFrame extends StackFrame {
  _condition: any;
  _mode: "WHILE" | "UNTIL";

  constructor(condition: any, body: Block[], mode: "WHILE" | "UNTIL") {
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
    body: Block[],
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

// export class ProcedureFrameReturn extends ProcedureFrameNoReturn {
//   _returnValue: number | string | boolean | null;
//   _returnDestination: number | null;
//   _arguments: { name: string; value: Value }[];
//   _evaluationId: number;

//   constructor(
//     procedure: Procedure,
//     args: { name: string; value: Value }[],
//     evaluationId: number,
//   ) {
//     super(procedure, []);
//     this._arguments = args;
//     this._returnValue = null;
//     this._returnDestination = null;
//     this._evaluationId = evaluationId;
//   }
// }

// export type EvaluationFrame = {
//   id: number;
//   expression: Value;
//   result: number | string | boolean | null | undefined;
//   state: "evaluating" | "evaluated" | "error";
//   waitingForProcedure: ProcedureFrameReturn | null;
// };
