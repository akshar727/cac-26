class ImproperVariableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImproperVariableError";
  }
}

class InvalidFieldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFieldError";
  }
}

class NoProcessingThreadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoProcessingThreadError";
  }
}

export { ImproperVariableError, InvalidFieldError, NoProcessingThreadError };
