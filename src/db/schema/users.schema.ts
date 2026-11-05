import {
  check,
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "deactivated",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    tokenVersion: integer("token_version").notNull().default(0),

    status: accountStatusEnum("status").notNull().default("active"),

    role: userRoleEnum("role").notNull().default("user"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Email normalization is also enforced in PostgreSQL so other clients cannot bypass it.
    check(
      "users_email_normalized_check",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
  ],
);
