import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";

export async function getUserAccount(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
