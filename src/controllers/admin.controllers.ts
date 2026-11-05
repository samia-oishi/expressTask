import type { Request, Response } from "express";

import {
  deactivateAdminUser,
  deleteAdminUser,
  getAdminUserDetails,
  listUsers,
  reactivateAdminUser,
  updateAdminUserRole,
} from "../services/admin.service.js";
import {
  adminUserListQuerySchema,
  adminUserParamsSchema,
  updateUserRoleSchema,
} from "../validators/admin.validators.js";

export async function listAdminUsers(req: Request, res: Response) {
  const query = adminUserListQuerySchema.parse(req.query);
  const result = await listUsers(query);

  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
}

export async function getAdminUser(req: Request, res: Response) {
  const { userId } = adminUserParamsSchema.parse(req.params);
  const user = await getAdminUserDetails(req.user!.id, userId);

  return res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: { user },
  });
}

export async function changeAdminUserRole(req: Request, res: Response) {
  const { userId } = adminUserParamsSchema.parse(req.params);
  const input = updateUserRoleSchema.parse(req.body);
  const user = await updateAdminUserRole(req.user!.id, userId, input);

  return res.status(200).json({
    success: true,
    message: "User role updated and existing sessions invalidated",
    data: { user },
  });
}

export async function deactivateUserAsAdmin(req: Request, res: Response) {
  const { userId } = adminUserParamsSchema.parse(req.params);
  await deactivateAdminUser(req.user!.id, userId);

  return res.status(200).json({
    success: true,
    message: "User account deactivated and existing sessions invalidated",
  });
}

export async function reactivateUserAsAdmin(req: Request, res: Response) {
  const { userId } = adminUserParamsSchema.parse(req.params);
  await reactivateAdminUser(req.user!.id, userId);

  return res.status(200).json({
    success: true,
    message: "User account reactivated successfully",
  });
}

export async function deleteUserAsAdmin(req: Request, res: Response) {
  const { userId } = adminUserParamsSchema.parse(req.params);
  await deleteAdminUser(req.user!.id, userId);

  return res.status(204).send();
}
