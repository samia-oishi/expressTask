import { z } from "zod";

import { newPasswordSchema } from "./auth.validators.js";

const currentPasswordSchema = z
  .string()
  .min(1, "Current password is required")
  .max(72, "Current password must not exceed 72 characters")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Current password must not exceed 72 UTF-8 bytes",
  );

export const changePasswordSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    newPassword: newPasswordSchema,
  })
  .strict();

export const passwordConfirmationSchema = z
  .object({
    currentPassword: currentPasswordSchema,
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordConfirmationInput = z.infer<
  typeof passwordConfirmationSchema
>;
