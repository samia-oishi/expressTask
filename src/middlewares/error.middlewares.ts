import type { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  const isMalformedJson =
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed";

  if (isMalformedJson) {
    res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorHandler;