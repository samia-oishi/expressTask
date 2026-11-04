import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";

export const emailVerificationPurposeEnum = pgEnum(
  "email_verification_purpose",
  ["initial_verification", "email_change"],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    purpose: emailVerificationPurposeEnum("purpose").notNull(),

    // Initial verification uses the user's current email; email changes store the pending address.
    newEmail: varchar("new_email", { length: 255 }),

    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    usedAt: timestamp("used_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_verification_tokens_user_id_idx").on(table.userId),
    check(
      "email_verification_tokens_new_email_check",
      sql`(
        (${table.purpose} = 'initial_verification' AND ${table.newEmail} IS NULL)
        OR
        (${table.purpose} = 'email_change' AND ${table.newEmail} IS NOT NULL AND ${table.newEmail} = lower(btrim(${table.newEmail})))
      )`,
    ),
  ],
);
