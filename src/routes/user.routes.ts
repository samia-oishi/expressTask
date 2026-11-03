import { Router } from "express";
import { authenticate } from "../middlewares/auth.middlewares.js";

const router = Router();

router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved successfully",
    data: {
      user: req.user,
    },
  });
});

export default router;