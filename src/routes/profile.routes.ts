import { Router } from "express";

import { authenticate } from "../middlewares/auth.middlewares.js";

import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/profile.controllers.js";

const router = Router();

router.use(authenticate);

router.get("/", getUserProfile);
router.patch("/", updateUserProfile);

export default router;
