import bcrypt from "bcrypt";
import { and, eq, isNull, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { profiles } from "../db/schema/profiles.schema.js";
import { passwordResetTokens } from "../db/schema/password-reset-tokens.schema.js";
import { users } from "../db/schema/users.schema.js";
import { AppError } from "../errors/app-error.js";
import {
  createSecurityToken,
  hashSecurityToken,
  minutesFromNow,
} from "../utils/security-tokens.js";
import type {
  EmailOnlyInput,
  ReactivateInput,
  ResetPasswordInput,
  SigninInput,
  SignupInput,
} from "../validators/auth.validators.js";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "./password-reset-email.service.js";

const PASSWORD_RESET_MINUTES = 30;

function signAccessToken(userId: string, tokenVersion: number) {
  return jwt.sign({ tokenVersion }, env.jwtSecret, {
    algorithm: "HS256",
    subject: userId,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    expiresIn: env.jwtExpiresInSeconds,
  });
}

export async function signupUser(input: SignupInput) {
  const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);

  return db.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!user) {
      throw new Error("User insert did not return a record");
    }

    const [profile] = await transaction
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: input.displayName,
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
      })
      .returning({
        id: profiles.id,
        userId: profiles.userId,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      });

    if (!profile) {
      throw new Error("Profile insert did not return a record");
    }

    return { user, profile };
  });
}

export async function signinUser(input: SigninInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.status === "deactivated") {
    throw new AppError(
      403,
      "Account is deactivated. Reactivate it before signing in",
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    accessToken: signAccessToken(user.id, user.tokenVersion),
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresInSeconds,
  };
}

export async function signoutUser(userId: string) {
  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

function validatePasswordResetToken(
  token: typeof passwordResetTokens.$inferSelect | undefined,
) {
  if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, "Invalid or expired password reset token");
  }

  return token;
}

export async function forgotPassword(input: EmailOnlyInput) {
  if (!isPasswordResetEmailConfigured()) {
    throw new AppError(503, "Password reset email is not configured");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user || user.status !== "active") {
    return;
  }

  const reset = createSecurityToken();
  const now = new Date();

  const [record] = await db.transaction(async (transaction) => {
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    return transaction
      .insert(passwordResetTokens)
      .values({
        userId: user.id,
        tokenHash: reset.tokenHash,
        expiresAt: minutesFromNow(PASSWORD_RESET_MINUTES),
      })
      .returning({ id: passwordResetTokens.id });
  });

  if (!record) {
    throw new Error("Password reset token insert did not return a record");
  }

  try {
    await sendPasswordResetEmail(user.email, reset.token);
  } catch (error) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    console.error("Password reset email delivery failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashSecurityToken(input.token);

  const [preliminaryToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  validatePasswordResetToken(preliminaryToken);

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    env.bcryptSaltRounds,
  );
  const now = new Date();

  await db.transaction(async (transaction) => {
    const [storedToken] = await transaction
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1)
      .for("update");

    const validToken = validatePasswordResetToken(storedToken);

    const [updatedUser] = await transaction
      .update(users)
      .set({
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(users.id, validToken.userId))
      .returning({ id: users.id });

    if (!updatedUser) {
      throw new AppError(400, "Invalid or expired password reset token");
    }

    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, validToken.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  });
}

export async function reactivateUser(input: ReactivateInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new AppError(
      401,
      "Unable to reactivate account with the provided credentials",
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      "Unable to reactivate account with the provided credentials",
    );
  }

  if (user.status === "active") {
    throw new AppError(409, "Account is already active");
  }

  await db
    .update(users)
    .set({
      status: "active",
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
}
