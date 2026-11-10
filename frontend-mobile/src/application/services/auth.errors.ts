export class AuthValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "AuthValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class AuthApiError extends Error {
  public readonly statusCode: number;
  public readonly isSessionExpired: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, isSessionExpired = false, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.statusCode = statusCode;
    this.isSessionExpired = isSessionExpired;
    this.code = code;
  }
}
