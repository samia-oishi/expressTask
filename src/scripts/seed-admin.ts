import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { env } from "../config/env.js";
import { client, db } from "../db/index.js";
import { profiles } from "../db/schema/profiles.schema.js";
import { users } from "../db/schema/users.schema.js";
import {
  emailSchema,
  newPasswordSchema,
} from "../validators/auth.validators.js";
import { displayNameSchema } from "../validators/profile.validators.js";

class AdminSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminSeedError";
  }
}

const adminSeedSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  displayName: displayNameSchema,
});

async function seedAdmin() {
  const input = adminSeedSchema.parse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    displayName: process.env.ADMIN_DISPLAY_NAME,
  });

  const [existingUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser?.role === "admin") {
    console.log("Initial administrator already exists; no changes were made");
    return;
  }

  if (existingUser) {
    throw new AdminSeedError(
      "ADMIN_EMAIL already belongs to a non-admin account; choose a different email",
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    env.bcryptSaltRounds,
  );
  await db.transaction(async (transaction) => {
    const [admin] = await transaction
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        role: "admin",
      })
      .returning({ id: users.id });

    if (!admin) {
      throw new AdminSeedError("Administrator insert did not return a record");
    }

    const [profile] = await transaction
      .insert(profiles)
      .values({
        userId: admin.id,
        displayName: input.displayName,
      })
      .returning({ id: profiles.id });

    if (!profile) {
      throw new AdminSeedError("Administrator profile was not created");
    }
  });

  console.log("Initial administrator and profile created successfully");
}

seedAdmin()
  .catch((error: unknown) => {
    if (error instanceof ZodError) {
      console.error(
        "Admin seed configuration is invalid:",
        error.issues.map((issue) => issue.message).join("; "),
      );
    } else if (error instanceof AdminSeedError) {
      console.error(error.message);
    } else {
      console.error("Admin seed failed because of an unexpected error");
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
