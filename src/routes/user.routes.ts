import { Router } from "express";
import { authenticate } from "../middlewares/auth.middlewares.js";
import {
  changeCurrentPassword,
  deactivateCurrentAccount,
  deleteCurrentAccount,
  getCurrentUser,
} from "../controllers/user.controllers.js";

const router = Router();

router.get("/me", authenticate, getCurrentUser);
router.patch("/me/password", authenticate, changeCurrentPassword);
router.post("/me/deactivate", authenticate, deactivateCurrentAccount);
router.delete("/me", authenticate, deleteCurrentAccount);

export default router;
