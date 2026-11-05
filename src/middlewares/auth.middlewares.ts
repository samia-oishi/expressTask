import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";
import { AppError } from "../errors/app-error.js";

type UserRole = typeof users.$inferSelect.role;

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const bearerMatch = authHeader?.match(/^Bearer ([^\s]+)$/i);

  if (!bearerMatch?.[1]) {
    return next(new AppError(401, "Authentication token is required"));
  }

  const token = bearerMatch[1];

  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      decoded.sub,
    ) ||
    typeof decoded.tokenVersion !== "number" ||
    !Number.isInteger(decoded.tokenVersion) ||
    decoded.tokenVersion < 0
  ) {
    return next(new AppError(401, "Invalid token payload"));
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        tokenVersion: users.tokenVersion,
        status: users.status,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, decoded.sub))
      .limit(1);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return next(new AppError(401, "Invalid or expired token"));
    }

    if (user.status !== "active") {
      return next(new AppError(403, "Account is deactivated"));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication is required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, "You do not have permission to perform this action"),
      );
    }

    return next();
  };
}
