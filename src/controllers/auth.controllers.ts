import type { Request, Response } from "express";

import { signinSchema, signupSchema } from "../validators/auth.validators.js";
import { signinUser, signupUser, signoutUser } from "../services/auth.service.js";

export async function signup(req: Request, res: Response) {
  const input = signupSchema.parse(req.body);
  const result = await signupUser(input);

  return res.status(201).json({
    success: true,
    message: "Account and profile created successfully",
    data: result,
  });
}
export async function signin(req: Request, res: Response) {
  const input = signinSchema.parse(req.body);
  const result = await signinUser(input);

  return res.status(200).json({
    success: true,
    message: "Signed in successfully",
    data: result,
  });
}
export async function signout(req: Request, res: Response) {
  await signoutUser(req.user!.id);

  return res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
}
