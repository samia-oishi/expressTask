import type { ErrorRequestHandler, RequestHandler } from "express";
import { PostgresError } from "postgres";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error.js";

function findPostgresError(error: unknown): PostgresError | null {
  let current = error;

  // Drizzle can wrap the original postgres-js error in one or more causes.
  for (let depth = 0; depth < 4; depth += 1) {
    if (current instanceof PostgresError) {
      return current;
    }

    if (
      typeof current !== "object" ||
      current === null ||
      !("cause" in current)
    ) {
      return null;
    }

    current = current.cause;
  }

  return null;
}

function mapPostgresError(error: PostgresError): AppError | null {
  if (error.code === "23505") {
    if (error.constraint_name === "users_email_unique") {
      return new AppError(409, "An account with this email already exists");
    }

    if (error.constraint_name === "profiles_user_id_unique") {
      return new AppError(409, "A profile already exists for this account");
    }

    return new AppError(409, "A record with these details already exists");
  }

  if (error.code === "23503") {
    return new AppError(409, "The related record does not exist");
  }

  if (error.code === "23502" || error.code === "23514") {
    return new AppError(400, "The submitted data violates a database constraint");
  }

  return null;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isMalformedJson =
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed";

  if (isMalformedJson) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  const postgresError = findPostgresError(err);
  const mappedPostgresError = postgresError
    ? mapPostgresError(postgresError)
    : null;

  if (mappedPostgresError) {
    res.status(mappedPostgresError.statusCode).json({
      success: false,
      message: mappedPostgresError.message,
    });
    return;
  }

  // Only the error type is logged so SQL details and sensitive values stay private.
  console.error("Unexpected server error", {
    errorType: err instanceof Error ? err.name : typeof err,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorHandler;
