const express = require("express");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const assessmentRoutes = require("./routes/assessment");
const reportRoutes = require("./routes/report");
const { AppError } = require("./utils/errors");
const { createRequestId } = require("./utils/requestId");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    req.requestId = createRequestId();
    next();
  });

  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(adminRoutes);
  app.use(authRoutes);
  app.use(assessmentRoutes);
  app.use(reportRoutes);

  app.use((req, res) => {
    res.status(404).json({
      code: "NOT_FOUND",
      message: "route not found",
      requestId: req.requestId,
    });
  });

  app.use((error, req, res, next) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        requestId: req.requestId,
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "internal server error",
      requestId: req.requestId,
    });
  });

  return app;
}

module.exports = {
  createApp,
};
