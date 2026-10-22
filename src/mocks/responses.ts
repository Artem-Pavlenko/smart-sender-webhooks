import { HttpResponse } from "msw";

import type { ErrorBody, ErrorType, FieldErrors } from "../api/types";

const ERRORS = {
  400: { type: "BadRequestException", message: "Bad request." },
  401: { type: "AuthenticationException", message: "Unauthenticated." },
  404: { type: "NotFoundException", message: "Not found." },
  419: { type: "TokenMismatchException", message: "CSRF token mismatch." },
  422: { type: "ValidationException", message: "The given data was invalid." },
} as const satisfies Record<number, { type: ErrorType; message: string }>;

export type ErrorStatus = keyof typeof ERRORS;

export function errorResponse(status: ErrorStatus, payload?: FieldErrors) {
  const body: ErrorBody = {
    error: { ...ERRORS[status], ...(payload && { payload }) },
  };
  return HttpResponse.json(body, { status });
}

export function validationError(payload: FieldErrors) {
  return errorResponse(422, payload);
}
