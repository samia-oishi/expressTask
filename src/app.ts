import express from "express";
import authRouter from "./routes/auth.routes.js";
import demoRouter from "./routes/demo.routes.js";
import errorHandler, { notFoundHandler } from "./middlewares/error.middlewares.js";
import userRouter from "./routes/user.routes.js";
import profileRouter from "./routes/profile.routes.js";
const app = express();

// Parse incoming JSON
app.use(express.json());

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "Express API is running",
  });
});

// Mount demo routes
app.use("/api/v1", demoRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/users/me/profile", profileRouter);

app.use(notFoundHandler);

// Error handler must come after routes
app.use(errorHandler);

export default app;
