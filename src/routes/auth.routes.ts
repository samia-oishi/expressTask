import { Router } from "express";
import {
  completePasswordReset,
  reactivate,
  requestPasswordReset,
  signin,
  signup,
  signout,
} from "../controllers/auth.controllers.js";
import { authenticate } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", authenticate, signout);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", completePasswordReset);
router.post("/reactivate", reactivate);

export default router;
