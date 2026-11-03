import bcrypt from "bcrypt";
import { PostgresError } from "postgres";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.schema.js";
import type { SignupInput } from "../validators/auth.validators.js";
import jwt from "jsonwebtoken";
import type { SigninInput } from "../validators/auth.validators.js";
import { eq } from "drizzle-orm";

export async function signupUser(input: SignupInput) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  // Hash the password before storing it
  const passwordHash = await bcrypt.hash(input.password, saltRounds);

  try {
    const [user] = await db
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

    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause instanceof PostgresError &&
      error.cause.code === "23505"
    ) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}
export async function signinUser(input: SigninInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
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