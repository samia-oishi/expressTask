import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authHeader.slice(7);

  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.tokenVersion !== "number"
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid token payload",
    });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        tokenVersion: users.tokenVersion,
      })
      .from(users)
      .where(eq(users.id, decoded.sub))
      .limit(1);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}