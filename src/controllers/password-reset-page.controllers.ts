import type { Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error.js";
import { resetPassword } from "../services/auth.service.js";
import {
  passwordResetTokenSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

function page(title: string, content: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; color: #1f2937; }
    form { display: grid; gap: 1rem; }
    input, button { font: inherit; padding: .75rem; }
    button { cursor: pointer; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

function sendPage(res: Response, status: number, html: string) {
  return res
    .status(status)
    .set({
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    })
    .type("html")
    .send(html);
}

export function showPasswordResetPage(req: Request, res: Response) {
  const token = passwordResetTokenSchema.safeParse(req.query.token);

  if (!token.success) {
    return sendPage(
      res,
      400,
      page("Invalid reset link", "<h1>Invalid reset link</h1><p>Request a new password reset email.</p>"),
    );
  }

  return sendPage(
    res,
    200,
    page(
      "Reset password",
      `<h1>Reset password</h1>
<form method="post" action="/reset-password">
  <input type="hidden" name="token" value="${token.data}">
  <label for="newPassword">New password</label>
  <input id="newPassword" name="newPassword" type="password" minlength="8" maxlength="72" required autocomplete="new-password">
  <button type="submit">Reset password</button>
</form>`,
    ),
  );
}

export async function submitPasswordResetPage(req: Request, res: Response) {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await resetPassword(input);

    return sendPage(
      res,
      200,
      page(
        "Password reset",
        "<h1>Password reset successfully</h1><p>You can now sign in with your new password.</p>",
      ),
    );
  } catch (error) {
    if (error instanceof ZodError || error instanceof AppError) {
      return sendPage(
        res,
        400,
        page(
          "Password reset failed",
          "<h1>Password reset failed</h1><p>The link is invalid or expired, or the new password is not valid.</p>",
        ),
      );
    }

    throw error;
  }
}
