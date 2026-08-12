import { Procedure, ProcedureCallArgument } from "@/types/field";
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

export class ProcedureFrame extends StackFrame {
  _procedure: Procedure;
  _arguments: ProcedureCallArgument[];
  returnLocation: number | null = null;

  constructor(
    procedure: Procedure,
    args: ProcedureCallArgument[],
    returnLocation: number | null = null,
  ) {
    super(procedure.body);
    this._procedure = procedure;
    this._arguments = args;
    this.returnLocation = returnLocation;
  }
}
