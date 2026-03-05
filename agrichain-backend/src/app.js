const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/healthRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const { corsOrigins } = require("./config");
const { AppError } = require("./services/blockchainService");

const app = express();

const corsOptions = corsOrigins.includes("*")
  ? { origin: true, credentials: true }
  : { origin: corsOrigins, credentials: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.json({
    service: "agrichain-blockchain-backend",
    status: "running",
    health: "/health",
  });
});

app.use("/", healthRoutes);
app.use("/blockchain", blockchainRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error("[api] Unhandled error:", error);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : error.message,
  });
});

module.exports = app;
