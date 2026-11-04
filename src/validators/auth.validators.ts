import { z } from "zod";
import {
  avatarUrlSchema,
  bioSchema,
  displayNameSchema,
} from "./profile.validators.js";

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(72, "Password must not exceed 72 characters"),

    displayName: displayNameSchema,

    bio: bioSchema.optional(),

    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address")
    .max(255),

  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password must not exceed 72 characters"),
}).strict();

export type SigninInput = z.infer<typeof signinSchema>;
