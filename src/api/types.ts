export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookList {
  data: Webhook[];
  paging: {
    pages: { current: number; last: number };
    results: { total: number; limitation: number };
  };
}

export type ErrorType =
  | "BadRequestException"
  | "AuthenticationException"
  | "NotFoundException"
  | "TokenMismatchException"
  | "ValidationException";

export type FieldErrors = Record<string, string[]>;

export interface ErrorBody {
  error: {
    type: ErrorType;
    message: string;
    payload?: FieldErrors;
  };
}
