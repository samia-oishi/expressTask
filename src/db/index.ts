import "dotenv/config";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { users } from "./schema/users.schema.js";
import { profiles } from "./schema/profiles.schema.js";
import { passwordResetTokens } from "./schema/password-reset-tokens.schema.js";
import { emailVerificationTokens } from "./schema/email-verification-tokens.schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const client = postgres(connectionString);

export const db = drizzle(client, {
  schema: {
    users,
    profiles,
    passwordResetTokens,
    emailVerificationTokens,
  },
});

export { client };
