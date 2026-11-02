import express from "express";
import demoRouter from "./routes/demo.routes.js";
import errorHandler from "./middlewares/error.middlewares.js";

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

// Error handler must come after routes
app.use(errorHandler);

export default app;