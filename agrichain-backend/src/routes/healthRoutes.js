const express = require("express");
const { blockchainService } = require("../services/blockchainService");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      api: "up",
      store: "up",
      blockchain: blockchainService.isBlockchainLive() ? "connected" : "simulation",
      network: blockchainService.networkName(),
    },
  });
});

module.exports = router;
