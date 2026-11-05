import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { profiles } from "../db/schema/profiles.schema.js";
import { users } from "../db/schema/users.schema.js";
import { AppError } from "../errors/app-error.js";
import type {
  AdminUserListQuery,
  UpdateUserRoleInput,
} from "../validators/admin.validators.js";

type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type SafeUserRow = {
  id: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "deactivated";
  createdAt: Date;
  updatedAt: Date;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  profileCreatedAt: Date;
  profileUpdatedAt: Date;
};

function rejectSelfTarget(actorId: string, targetId: string) {
  if (actorId === targetId) {
    throw new AppError(
      403,
      "Admin endpoints cannot be used to manage your own account",
    );
  }
}

async function lockActiveAdmins(
  transaction: DatabaseTransaction,
  actorId: string,
) {
  const activeAdmins = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")))
    .orderBy(users.id)
    .for("update");

  if (!activeAdmins.some((admin) => admin.id === actorId)) {
    throw new AppError(403, "Administrator access is no longer available");
  }

  return activeAdmins;
}

function safeUserSelection() {
  return {
    id: users.id,
    email: users.email,
    role: users.role,
    status: users.status,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    displayName: profiles.displayName,
    bio: profiles.bio,
    avatarUrl: profiles.avatarUrl,
    profileCreatedAt: profiles.createdAt,
    profileUpdatedAt: profiles.updatedAt,
  };
}

function mapSafeUser(row: SafeUserRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    profile: {
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      createdAt: row.profileCreatedAt,
      updatedAt: row.profileUpdatedAt,
    },
  };
}

export async function listUsers(query: AdminUserListQuery) {
  const conditions: SQL[] = [];

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchCondition = or(
      ilike(users.email, pattern),
      ilike(profiles.displayName, pattern),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (query.role) {
    conditions.push(eq(users.role, query.role));
  }

  if (query.status) {
    conditions.push(eq(users.status, query.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select(safeUserSelection())
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(where),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    users: rows.map(mapSafeUser),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getAdminUserDetails(actorId: string, userId: string) {
  rejectSelfTarget(actorId, userId);

  const [row] = await db
    .select(safeUserSelection())
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    throw new AppError(404, "User account not found");
  }

  return mapSafeUser(row);
}

export async function updateAdminUserRole(
  actorId: string,
  targetId: string,
  input: UpdateUserRoleInput,
) {
  rejectSelfTarget(actorId, targetId);

  return db.transaction(async (transaction) => {
    const activeAdmins = await lockActiveAdmins(transaction, actorId);
    const [target] = await transaction
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .for("update");

    if (!target) {
      throw new AppError(404, "User account not found");
    }

    if (target.role === input.role) {
      throw new AppError(409, `User already has the ${input.role} role`);
    }

    if (
      target.role === "admin" &&
      target.status === "active" &&
      input.role === "user" &&
      activeAdmins.length <= 1
    ) {
      throw new AppError(409, "The last active administrator cannot be demoted");
    }

    const [updatedUser] = await transaction
      .update(users)
      .set({
        role: input.role,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId))
      .returning({ id: users.id, role: users.role });

    if (!updatedUser) {
      throw new AppError(404, "User account not found");
    }

    return updatedUser;
  });
}

export async function deactivateAdminUser(actorId: string, targetId: string) {
  rejectSelfTarget(actorId, targetId);

  await db.transaction(async (transaction) => {
    const activeAdmins = await lockActiveAdmins(transaction, actorId);
    const [target] = await transaction
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .for("update");

    if (!target) {
      throw new AppError(404, "User account not found");
    }

    if (target.status === "deactivated") {
      throw new AppError(409, "User account is already deactivated");
    }

    if (target.role === "admin" && activeAdmins.length <= 1) {
      throw new AppError(409, "The last active administrator cannot be deactivated");
    }

    await transaction
      .update(users)
      .set({
        status: "deactivated",
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId));

  });
}

export async function reactivateAdminUser(actorId: string, targetId: string) {
  rejectSelfTarget(actorId, targetId);

  await db.transaction(async (transaction) => {
    await lockActiveAdmins(transaction, actorId);
    const [target] = await transaction
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .for("update");

    if (!target) {
      throw new AppError(404, "User account not found");
    }

    if (target.status === "active") {
      throw new AppError(409, "User account is already active");
    }

    await transaction
      .update(users)
      .set({
        status: "active",
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId));
  });
}

export async function deleteAdminUser(actorId: string, targetId: string) {
  rejectSelfTarget(actorId, targetId);

  await db.transaction(async (transaction) => {
    const activeAdmins = await lockActiveAdmins(transaction, actorId);
    const [target] = await transaction
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .for("update");

    if (!target) {
      throw new AppError(404, "User account not found");
    }

    if (
      target.role === "admin" &&
      target.status === "active" &&
      activeAdmins.length <= 1
    ) {
      throw new AppError(409, "The last active administrator cannot be deleted");
    }

    await transaction.delete(users).where(eq(users.id, targetId));
  });
}
