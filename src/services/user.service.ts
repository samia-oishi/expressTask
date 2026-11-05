import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";
import { AppError } from "../errors/app-error.js";
import type {
  ChangePasswordInput,
  PasswordConfirmationInput,
} from "../validators/user.validators.js";

async function getUserWithPassword(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, "User account not found");
  }

  return user;
}

async function verifyCurrentPassword(userId: string, currentPassword: string) {
  const user = await getUserWithPassword(userId);
  const passwordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(401, "Current password is incorrect");
  }

  return user;
}

export async function getUserAccount(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await verifyCurrentPassword(userId, input.currentPassword);
  const passwordIsUnchanged = await bcrypt.compare(
    input.newPassword,
    user.passwordHash,
  );

  if (passwordIsUnchanged) {
    throw new AppError(
      400,
      "New password must be different from the current password",
    );
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    env.bcryptSaltRounds,
  );

  await db
    .update(users)
    .set({
      passwordHash,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function deactivateAccount(
  userId: string,
  input: PasswordConfirmationInput,
) {
  await verifyCurrentPassword(userId, input.currentPassword);

  await db.transaction(async (transaction) => {
    const activeAdmins = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")))
      .orderBy(users.id)
      .for("update");

    const [currentUser] = await transaction
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");

    if (!currentUser) {
      throw new AppError(404, "User account not found");
    }

    if (
      currentUser.role === "admin" &&
      currentUser.status === "active" &&
      activeAdmins.length <= 1
    ) {
      throw new AppError(409, "The last active administrator cannot be deactivated");
    }

    await transaction
      .update(users)
      .set({
        status: "deactivated",
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}

export async function deleteAccount(
  userId: string,
  input: PasswordConfirmationInput,
) {
  await verifyCurrentPassword(userId, input.currentPassword);

  await db.transaction(async (transaction) => {
    const activeAdmins = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")))
      .orderBy(users.id)
      .for("update");

    const [currentUser] = await transaction
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");

    if (!currentUser) {
      throw new AppError(404, "User account not found");
    }

    if (
      currentUser.role === "admin" &&
      currentUser.status === "active" &&
      activeAdmins.length <= 1
    ) {
      throw new AppError(409, "The last active administrator cannot be deleted");
    }

    const [deletedUser] = await transaction
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!deletedUser) {
      throw new AppError(404, "User account not found");
    }
  });
}
