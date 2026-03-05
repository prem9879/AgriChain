const express = require("express");
const { blockchainService } = require("../services/blockchainService");

const router = express.Router();

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get(
  "/stats",
  asyncRoute(async (req, res) => {
    const stats = blockchainService.getStats(req.query.user_id || 1);
    res.json({ stats });
  })
);

router.get(
  "/trade/list",
  asyncRoute(async (req, res) => {
    const trades = blockchainService.listTrades(req.query.user_id || 1);
    res.json({ trades });
  })
);

router.get(
  "/trade/status",
  asyncRoute(async (req, res) => {
    const trade = blockchainService.getTradeStatus(req.query.trade_id);
    res.json({ trade });
  })
);

router.post(
  "/trade/create",
  asyncRoute(async (req, res) => {
    const trade = await blockchainService.createTrade(req.body || {});
    res.status(201).json({ trade });
  })
);

router.post(
  "/trade/confirm-delivery",
  asyncRoute(async (req, res) => {
    const trade = await blockchainService.confirmDelivery(req.body?.trade_id);
    res.json({ trade });
  })
);

router.post(
  "/settlement/lock",
  asyncRoute(async (req, res) => {
    const settlement = await blockchainService.lockEscrow(req.body?.trade_id);
    res.json({ settlement });
  })
);

router.post(
  "/settlement/release",
  asyncRoute(async (req, res) => {
    const settlement = await blockchainService.releaseEscrow(req.body?.trade_id);
    res.json({ settlement });
  })
);

router.get(
  "/proof/list",
  asyncRoute(async (req, res) => {
    const proofs = blockchainService.listProofs(req.query.user_id || 1);
    res.json({ proofs });
  })
);

router.post(
  "/proof/create",
  asyncRoute(async (req, res) => {
    const proof = await blockchainService.createProof(req.body || {});
    res.status(201).json({ proof });
  })
);

module.exports = router;
