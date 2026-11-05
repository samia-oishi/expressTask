import { z } from "zod";

const optionalQueryString = (schema: z.ZodString) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );

export const adminUserParamsSchema = z
  .object({
    userId: z.string().uuid("User ID must be a valid UUID"),
  })
  .strict();

export const adminUserListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: optionalQueryString(z.string().trim().max(255)),
    role: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["user", "admin"]).optional(),
    ),
    status: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["active", "deactivated"]).optional(),
    ),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(["user", "admin"]),
  })
  .strict();

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
