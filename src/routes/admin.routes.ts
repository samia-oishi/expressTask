import { Router } from "express";

import {
  changeAdminUserRole,
  deactivateUserAsAdmin,
  deleteUserAsAdmin,
  getAdminUser,
  listAdminUsers,
  reactivateUserAsAdmin,
} from "../controllers/admin.controllers.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/users", listAdminUsers);
router.get("/users/:userId", getAdminUser);
router.patch("/users/:userId/role", changeAdminUserRole);
router.post("/users/:userId/deactivate", deactivateUserAsAdmin);
router.post("/users/:userId/reactivate", reactivateUserAsAdmin);
router.delete("/users/:userId", deleteUserAsAdmin);

export default router;
