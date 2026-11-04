import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { profiles } from "../db/schema/profiles.schema.js";
import { users } from "../db/schema/users.schema.js";

import type { UpdateProfileInput } from "../validators/profile.validators.js";

export async function getProfile(userId: string) {
  const [profile] = await db
    .select({
      id: profiles.id,
      userId: profiles.userId,
      email: users.email,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile ?? null;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const [updatedProfile] = await db
    .update(profiles)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId))
    .returning({
      id: profiles.id,
    });

  if (!updatedProfile) {
    return null;
  }

  // Read through the join so every profile response gets email from users.
  return getProfile(userId);
}
