import express from "express";
import swaggerUi from "swagger-ui-express";

import { openApiDocument, openApiYaml } from "./docs/swagger.js";
import adminRouter from "./routes/admin.routes.js";
import {
  showPasswordResetPage,
  submitPasswordResetPage,
} from "./controllers/password-reset-page.controllers.js";
import authRouter from "./routes/auth.routes.js";
import demoRouter from "./routes/demo.routes.js";
import errorHandler, { notFoundHandler } from "./middlewares/error.middlewares.js";
import userRouter from "./routes/user.routes.js";
import profileRouter from "./routes/profile.routes.js";
const app = express();
//to hide powered by express
app.disable("x-powered-by");

// Parse incoming JSON
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "Express API is running",
  });
});

app.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").send(openApiYaml);
});

app.get("/reset-password", showPasswordResetPage);
app.post("/reset-password", submitPasswordResetPage);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Express Task API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

// Mount demo routes
app.use("/api/v1", demoRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/users/me/profile", profileRouter);
app.use("/api/v1/admin", adminRouter);

app.use(notFoundHandler);

// Error handler must come after routes
app.use(errorHandler);

export default app;
