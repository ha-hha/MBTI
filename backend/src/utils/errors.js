class AppError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function createError(code, message, statusCode) {
  return new AppError(code, message, statusCode);
}

module.exports = {
  AppError,
  createError,
};
