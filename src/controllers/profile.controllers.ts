import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { getProfile, updateProfile } from "../services/profile.service.js";
import { updateProfileSchema } from "../validators/profile.validators.js";

export async function getUserProfile(req: Request, res: Response) {
  const profile = await getProfile(req.user!.id);

  if (!profile) {
    throw new AppError(404, "Profile not found");
  }

  return res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: { profile },
  });
}

export async function updateUserProfile(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const profile = await updateProfile(req.user!.id, input);

  if (!profile) {
    throw new AppError(404, "Profile not found");
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { profile },
  });
}
