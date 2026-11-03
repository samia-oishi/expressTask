import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { signinSchema, signupSchema } from "../validators/auth.validators.js";
import { signinUser, signupUser } from "../services/auth.service.js";

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = signupSchema.parse(req.body);
    const user = await signupUser(input);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return next(error);
  }
}
export async function signin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = signinSchema.parse(req.body);
    const result = await signinUser(input);

    return res.status(200).json({
      success: true,
      message: "Signed in successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return next(error);
  }
}