import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(100, "Display name must not exceed 100 characters");

export const bioSchema = z
  .string()
  .max(1000, "Bio must not exceed 1000 characters")
  .nullable();

export const avatarUrlSchema = z
  .string()
  .url("Please provide a valid avatar URL")
  .max(2048, "Avatar URL must not exceed 2048 characters")
  .nullable();

export const updateProfileSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema.optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
