import { Router } from "express";
import { authenticate } from "../middlewares/auth.middlewares.js";
import { getCurrentUser } from "../controllers/user.controllers.js";

const router = Router();

router.get("/me", authenticate, getCurrentUser);

export default router;
