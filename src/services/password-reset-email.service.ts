import nodemailer from "nodemailer";

import { env } from "../config/env.js";

export function isPasswordResetEmailConfigured() {
  return Boolean(env.smtpUser && env.smtpAppPassword);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
) {
  if (!env.smtpUser || !env.smtpAppPassword) {
    throw new Error("Password reset email is not configured");
  }

  const resetUrl = new URL("/reset-password", env.appBaseUrl);
  resetUrl.searchParams.set("token", token);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.smtpUser,
      pass: env.smtpAppPassword,
    },
  });

  await transporter.sendMail({
    from: `Express Task <${env.smtpUser}>`,
    to: email,
    subject: "Reset your Express Task password",
    text: `Open this link within 30 minutes to reset your password:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Open the link below within 30 minutes to reset your password:</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
