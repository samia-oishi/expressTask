import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { getUserAccount } from "../services/user.service.js";

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
