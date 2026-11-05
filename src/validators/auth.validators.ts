import { z } from "zod";
import {
  avatarUrlSchema,
  bioSchema,
  displayNameSchema,
} from "./profile.validators.js";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please provide a valid email address")
  .max(255);

export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(72, "Password must not exceed 72 characters")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  );

export const signupSchema = z
  .object({
    email: emailSchema,

    password: newPasswordSchema,

    displayName: displayNameSchema,

    bio: bioSchema.optional(),

    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export const signinSchema = z
  .object({
    email: emailSchema,

    password: z
      .string()
      .min(1, "Password is required")
      .max(72, "Password must not exceed 72 characters")
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must not exceed 72 UTF-8 bytes",
      ),
  })
  .strict();

export const emailOnlySchema = z.object({ email: emailSchema }).strict();

export const passwordResetTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Invalid password reset token");

export const resetPasswordSchema = z
  .object({
    token: passwordResetTokenSchema,
    newPassword: newPasswordSchema,
  })
  .strict();

export const reactivateSchema = signinSchema;

export type SigninInput = z.infer<typeof signinSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ReactivateInput = z.infer<typeof reactivateSchema>;
