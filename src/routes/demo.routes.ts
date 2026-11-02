import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
  });
});

router.post("/echo", (req, res) => {
  res.json({
    receivedData: req.body,
  });
});

export default router;