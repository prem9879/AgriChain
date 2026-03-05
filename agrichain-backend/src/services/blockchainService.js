const crypto = require("crypto");
const dataStore = require("../store/dataStore");
const blockchainClient = require("../blockchain/client");

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const STATUS_LABELS = {
  created: "Deal Created",
  confirmed: "Deal Confirmed",
  delivered: "Delivery Confirmed",
  locked: "Payment Locked",
  released: "Money Released",
  cancelled: "Deal Cancelled",
  disputed: "Dispute Open",
  simulated: "Simulated",
};

const nowIso = () => new Date().toISOString();

const toHash = (payload) =>
  `0x${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;

const normalizeText = (value, fieldName) => {
  const text = String(value || "").trim();
  if (!text) {
    throw new AppError(`${fieldName} is required`, 422);
  }
  return text;
};

const toPositiveInt = (value, fieldName) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 422);
  }
  return parsed;
};

const toPositiveNumber = (value, fieldName) => {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive number`, 422);
  }
  return parsed;
};

const mapStatusLabel = (status) => STATUS_LABELS[status] || status;

const tradeForUser = (trade, userId) => {
  const normalizedUserId = Number(userId);
  const role =
    Number(trade.seller_user_id) === normalizedUserId
      ? "seller"
      : Number(trade.buyer_user_id) === normalizedUserId
        ? "buyer"
        : null;

  return {
    ...trade,
    role,
    farmer_status: mapStatusLabel(trade.status),
  };
};

const findTradeOrThrow = (state, tradeId) => {
  const trade = state.trades.find((item) => item.trade_id === tradeId);
  if (!trade) {
    throw new AppError(`Trade ${tradeId} not found`, 404);
  }
  return trade;
};

const normalizeTradeId = (tradeId) => normalizeText(tradeId, "trade_id");

const generateId = (prefix) => `${prefix}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;

const getSettlementForTrade = (state, tradeId) =>
  state.settlements.find((item) => item.trade_id === tradeId) || null;

const blockchainService = {
  isBlockchainLive() {
    return blockchainClient.isLive;
  },

  networkName() {
    return blockchainClient.networkName;
  },

  getStats(userIdInput) {
    const userId = toPositiveInt(userIdInput || 1, "user_id");
    const state = dataStore.snapshot();

    const userTrades = state.trades.filter(
      (trade) =>
        Number(trade.seller_user_id) === userId || Number(trade.buyer_user_id) === userId
    );

    const tradeIds = new Set(userTrades.map((trade) => trade.trade_id));

    const userProofs = state.proofs.filter((proof) => Number(proof.user_id) === userId);
    const userSettlements = state.settlements.filter((item) => tradeIds.has(item.trade_id));

    const totalVolume = userTrades.reduce(
      (sum, trade) => sum + Number(trade.total_amount || 0),
      0
    );

    const lockedAmount = userSettlements
      .filter((item) => item.status === "locked")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      network: blockchainClient.networkName,
      blockchain_live: blockchainClient.isLive,
      trades: userTrades.length,
      proofs: userProofs.length,
      settlements: userSettlements.length,
      total_volume: Number(totalVolume.toFixed(2)),
      locked_amount: Number(lockedAmount.toFixed(2)),
    };
  },

  listTrades(userIdInput) {
    const userId = toPositiveInt(userIdInput || 1, "user_id");
    const state = dataStore.snapshot();

    return state.trades
      .filter(
        (trade) =>
          Number(trade.seller_user_id) === userId || Number(trade.buyer_user_id) === userId
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((trade) => tradeForUser(trade, userId));
  },

  getTradeStatus(tradeIdInput) {
    const tradeId = normalizeTradeId(tradeIdInput);
    const state = dataStore.snapshot();
    const trade = findTradeOrThrow(state, tradeId);
    const settlement = getSettlementForTrade(state, tradeId);

    return {
      ...trade,
      farmer_status: mapStatusLabel(trade.status),
      settlement,
    };
  },

  async createTrade(payload) {
    const sellerUserId = toPositiveInt(payload.seller_user_id || payload.sellerUserId, "seller_user_id");
    const buyerUserId = toPositiveInt(payload.buyer_user_id || payload.buyerUserId, "buyer_user_id");
    if (sellerUserId === buyerUserId) {
      throw new AppError("seller_user_id and buyer_user_id must be different", 422);
    }

    const crop = normalizeText(payload.crop, "crop").toLowerCase();
    const quantityKg = toPositiveNumber(payload.quantity_kg || payload.quantityKg, "quantity_kg");
    const pricePerKg = toPositiveNumber(payload.price_per_kg || payload.pricePerKg, "price_per_kg");

    const totalAmount = Number((quantityKg * pricePerKg).toFixed(2));
    const tradeId = generateId("TRD");
    const createdAt = nowIso();

    const agreementHash = toHash({
      tradeId,
      sellerUserId,
      buyerUserId,
      crop,
      quantityKg,
      pricePerKg,
      totalAmount,
      createdAt,
    });

    const chainTx = await blockchainClient.anchorTrade({
      tradeId,
      agreementHash,
      totalAmountRupees: totalAmount,
    });

    const trade = {
      trade_id: tradeId,
      seller_user_id: sellerUserId,
      buyer_user_id: buyerUserId,
      crop,
      quantity_kg: quantityKg,
      price_per_kg: pricePerKg,
      total_amount: totalAmount,
      quality_grade: payload.quality_grade || payload.qualityGrade || null,
      status: "confirmed",
      agreement_hash: agreementHash,
      tx_hash: chainTx.tx_hash,
      explorer_url: chainTx.explorer_url,
      blockchain_live: chainTx.blockchain_live,
      network: chainTx.network,
      created_at: createdAt,
      updated_at: createdAt,
    };

    dataStore.transaction((draft) => {
      draft.trades.push(trade);
    });

    return tradeForUser(trade, sellerUserId);
  },

  async confirmDelivery(tradeIdInput) {
    const tradeId = normalizeTradeId(tradeIdInput);
    const state = dataStore.snapshot();
    const trade = findTradeOrThrow(state, tradeId);

    if (trade.status === "released") {
      throw new AppError("Trade already released", 409);
    }

    if (trade.status === "delivered" || trade.status === "locked") {
      return {
        ...trade,
        farmer_status: mapStatusLabel(trade.status),
      };
    }

    const deliveredAt = nowIso();
    const deliveryHash = toHash({
      tradeId,
      deliveredAt,
      quantity_kg: trade.quantity_kg,
      amount: trade.total_amount,
    });

    const chainTx = await blockchainClient.confirmDelivery({
      tradeId,
      deliveryHash,
    });

    const updatedTrade = dataStore.transaction((draft) => {
      const draftTrade = findTradeOrThrow(draft, tradeId);
      draftTrade.status = "delivered";
      draftTrade.delivery_hash = deliveryHash;
      draftTrade.delivery_tx_hash = chainTx.tx_hash;
      draftTrade.updated_at = deliveredAt;
      draftTrade.explorer_url = chainTx.explorer_url || draftTrade.explorer_url;
      draftTrade.blockchain_live = chainTx.blockchain_live;
      draftTrade.network = chainTx.network;
      return draftTrade;
    });

    return {
      ...updatedTrade,
      farmer_status: mapStatusLabel(updatedTrade.status),
    };
  },

  async lockEscrow(tradeIdInput) {
    const tradeId = normalizeTradeId(tradeIdInput);
    const state = dataStore.snapshot();
    const trade = findTradeOrThrow(state, tradeId);

    if (trade.status === "released") {
      throw new AppError("Escrow already released for this trade", 409);
    }

    const existingSettlement = getSettlementForTrade(state, tradeId);
    if (existingSettlement && existingSettlement.status === "locked") {
      return existingSettlement;
    }

    const lockedAt = nowIso();
    const chainTx = await blockchainClient.lockEscrow({ tradeId });

    const settlement = dataStore.transaction((draft) => {
      const draftTrade = findTradeOrThrow(draft, tradeId);
      draftTrade.status = "locked";
      draftTrade.updated_at = lockedAt;
      draftTrade.explorer_url = chainTx.explorer_url || draftTrade.explorer_url;
      draftTrade.blockchain_live = chainTx.blockchain_live;
      draftTrade.network = chainTx.network;

      let draftSettlement = getSettlementForTrade(draft, tradeId);
      if (!draftSettlement) {
        draftSettlement = {
          settlement_id: generateId("SET"),
          trade_id: tradeId,
          amount: Number(draftTrade.total_amount || 0),
          status: "locked",
          locked_at: lockedAt,
          released_at: null,
          lock_tx_hash: chainTx.tx_hash,
          release_tx_hash: null,
          explorer_url: chainTx.explorer_url,
          blockchain_live: chainTx.blockchain_live,
          network: chainTx.network,
        };
        draft.settlements.push(draftSettlement);
      } else {
        draftSettlement.status = "locked";
        draftSettlement.amount = Number(draftTrade.total_amount || 0);
        draftSettlement.locked_at = lockedAt;
        draftSettlement.lock_tx_hash = chainTx.tx_hash;
        draftSettlement.explorer_url = chainTx.explorer_url || draftSettlement.explorer_url;
        draftSettlement.blockchain_live = chainTx.blockchain_live;
        draftSettlement.network = chainTx.network;
      }

      return draftSettlement;
    });

    return settlement;
  },

  async releaseEscrow(tradeIdInput) {
    const tradeId = normalizeTradeId(tradeIdInput);
    const state = dataStore.snapshot();
    const trade = findTradeOrThrow(state, tradeId);

    if (trade.status === "released") {
      return getSettlementForTrade(state, tradeId);
    }

    const settlement = getSettlementForTrade(state, tradeId);
    if (!settlement || settlement.status !== "locked") {
      throw new AppError("Escrow must be locked before release", 409);
    }

    const releasedAt = nowIso();
    const chainTx = await blockchainClient.releaseEscrow({ tradeId });

    const updatedSettlement = dataStore.transaction((draft) => {
      const draftTrade = findTradeOrThrow(draft, tradeId);
      draftTrade.status = "released";
      draftTrade.updated_at = releasedAt;
      draftTrade.explorer_url = chainTx.explorer_url || draftTrade.explorer_url;
      draftTrade.blockchain_live = chainTx.blockchain_live;
      draftTrade.network = chainTx.network;

      const draftSettlement = getSettlementForTrade(draft, tradeId);
      if (!draftSettlement) {
        throw new AppError("Settlement record missing for trade", 500);
      }

      draftSettlement.status = "released";
      draftSettlement.released_at = releasedAt;
      draftSettlement.release_tx_hash = chainTx.tx_hash;
      draftSettlement.explorer_url = chainTx.explorer_url || draftSettlement.explorer_url;
      draftSettlement.blockchain_live = chainTx.blockchain_live;
      draftSettlement.network = chainTx.network;
      return draftSettlement;
    });

    return updatedSettlement;
  },

  listProofs(userIdInput) {
    const userId = toPositiveInt(userIdInput || 1, "user_id");
    const state = dataStore.snapshot();

    return state.proofs
      .filter((proof) => Number(proof.user_id) === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async createProof(payload) {
    const userId = toPositiveInt(payload.user_id || payload.userId, "user_id");
    const crop = normalizeText(payload.crop, "crop").toLowerCase();
    const region = normalizeText(payload.region, "region");
    const modelVersion = normalizeText(
      payload.model_version || payload.modelVersion || "1.0.0",
      "model_version"
    );
    const recommendation = normalizeText(payload.recommendation || "advisory", "recommendation");

    const proofId = generateId("PRF");
    const createdAt = nowIso();
    const proofHash = toHash({
      proofId,
      userId,
      crop,
      region,
      modelVersion,
      recommendation,
      createdAt,
    });

    const chainTx = await blockchainClient.anchorProof({
      proofId,
      proofHash,
    });

    const proof = {
      proof_id: proofId,
      user_id: userId,
      crop,
      region,
      model_version: modelVersion,
      recommendation,
      proof_hash: proofHash,
      tx_hash: chainTx.tx_hash,
      explorer_url: chainTx.explorer_url,
      status: chainTx.blockchain_live ? "anchored" : "simulated",
      blockchain_live: chainTx.blockchain_live,
      network: chainTx.network,
      created_at: createdAt,
    };

    dataStore.transaction((draft) => {
      draft.proofs.push(proof);
    });

    return proof;
  },
};

module.exports = {
  blockchainService,
  AppError,
};
