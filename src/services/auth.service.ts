import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";
import { profiles } from "../db/schema/profiles.schema.js";
import type { SignupInput } from "../validators/auth.validators.js";
import jwt from "jsonwebtoken";
import type { SigninInput } from "../validators/auth.validators.js";
import { eq, sql } from "drizzle-orm";
import { AppError } from "../errors/app-error.js";

export async function signupUser(input: SignupInput) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  // Hash the password before storing it
  const passwordHash = await bcrypt.hash(input.password, saltRounds);

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

  const token = jwt.sign(
    {
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET!,
    {
      subject: user.id,
      expiresIn: "15m",
    },
  );

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 900,
  };
}
export async function signoutUser(userId: string) {
  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId));
}
