import { ERROR_CODES } from '../commons/errors.mjs';

function HttpResponse(status, e) {
  this.status = status;
  this.body = {
    code: e.code, // internal code
    error: e.message,
  };
}

export default function errorToHttp(e) {
  switch (e.code) {
    case ERROR_CODES.InvalidData:
      return new HttpResponse(400, e);
    case ERROR_CODES.NotFound:
      return new HttpResponse(404, e);
    case ERROR_CODES.NotAuthorized:
      return new HttpResponse(403, e);
    case ERROR_CODES.Conflict:
      return new HttpResponse(409, e);
    default:
      return new HttpResponse(
        500,
        'Internal server error. Contact your teacher!'
      );
  }
}
