function ApplicationError(code, message) {
  this.code = code;
  this.message = message;
}

export const ERROR_CODES = {
  InvalidData: 1,
  NotFound: 2,
  NotAuthorized: 3,
  Conflict: 4,
  InternalError: 5,
};

export default {
  INVALID_DATA: (message) =>
    new ApplicationError(ERROR_CODES.InvalidData, message),

  NOT_FOUND: (message) => new ApplicationError(ERROR_CODES.NotFound, message),

  NOT_AUTHORIZED: (message) =>
    new ApplicationError(ERROR_CODES.NotAuthorized, message),

  CONFLICT: (message) => new ApplicationError(ERROR_CODES.Conflict, message),

  INTERNAL_ERROR: (message) =>
    new ApplicationError(ERROR_CODES.InternalError, message),
};
