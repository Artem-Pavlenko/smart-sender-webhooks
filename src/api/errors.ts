import type { ErrorBody, FieldErrors } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly type: string | null;
  /** 422 payload: field name → messages. Empty for other statuses. */
  readonly fieldErrors: FieldErrors;

  constructor(
    status: number,
    message: string,
    type: string | null = null,
    fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.type = type;
    this.fieldErrors = fieldErrors;
  }

  /** Builds the error from a response body in the contract's `{ error: { … } }` format, if it is one. */
  static fromBody(status: number, body: unknown): ApiError {
    const error = (body as Partial<ErrorBody> | null)?.error;
    return new ApiError(
      status,
      error?.message ??
        `Unexpected response from the server (${status}). Please try again.`,
      error?.type ?? null,
      error?.payload ?? {},
    );
  }
}

/** The request never got a response (offline, DNS, CORS, server down). */
export class NetworkError extends Error {
  constructor() {
    super("Can't reach the server. Check your connection and try again.");
    this.name = "NetworkError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError)
    return error.message;
  return "Something went wrong. Please try again.";
}
