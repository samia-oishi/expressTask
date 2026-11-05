import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import {
  changePassword,
  deactivateAccount,
  deleteAccount,
  getUserAccount,
} from "../services/user.service.js";
import {
  changePasswordSchema,
  passwordConfirmationSchema,
} from "../validators/user.validators.js";

export async function getCurrentUser(req: Request, res: Response) {
  const user = await getUserAccount(req.user!.id);

  if (!user) {
    throw new AppError(404, "User account not found");
  }

  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved successfully",
    data: { user },
  });
}

export async function changeCurrentPassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);
  await changePassword(req.user!.id, input);

  return res.status(200).json({
    success: true,
    message:
      "Password changed successfully. Existing sessions were invalidated; sign in again",
  });
}

export async function deactivateCurrentAccount(req: Request, res: Response) {
  const input = passwordConfirmationSchema.parse(req.body);
  await deactivateAccount(req.user!.id, input);

  return res.status(200).json({
    success: true,
    message:
      "Your account has been temporarily disabled. Your account and profile information were retained, and you can reactivate later",
  });
}

export async function deleteCurrentAccount(req: Request, res: Response) {
  const input = passwordConfirmationSchema.parse(req.body);
  await deleteAccount(req.user!.id, input);

  return res.status(204).send();
}
