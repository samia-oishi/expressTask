export type ErrorDetail = {
  field: string;
  message: string;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly errors: ErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    message: string,
    errors?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
