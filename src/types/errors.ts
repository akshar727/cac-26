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

class MultipleBackdropError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MultipleBackdropError";
  }
}

export { ImproperVariableError, InvalidFieldError, NoProcessingThreadError, MultipleBackdropError };
