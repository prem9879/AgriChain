const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const rootDir = path.resolve(__dirname, "..");

const parseCorsOrigins = (rawValue) => {
  if (!rawValue || rawValue.trim() === "*") {
    return ["*"];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const resolveDatabaseFile = (rawValue) => {
  const defaultFile = path.resolve(rootDir, "data", "blockchain-db.json");
  if (!rawValue) {
    return defaultFile;
  }
  return path.isAbsolute(rawValue) ? rawValue : path.resolve(rootDir, rawValue);
};

const mode = (process.env.BLOCKCHAIN_MODE || "simulation").trim().toLowerCase();
const blockchain = {
  mode,
  networkName: process.env.BLOCKCHAIN_NETWORK || "local-simulation",
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "",
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "",
  explorerTxBase: process.env.BLOCKCHAIN_EXPLORER_TX_URL || "",
  explorerAddressBase: process.env.BLOCKCHAIN_EXPLORER_ADDRESS_URL || "",
};

blockchain.liveEnabled = Boolean(
  blockchain.mode === "live" &&
    blockchain.rpcUrl &&
    blockchain.privateKey &&
    blockchain.contractAddress
);

const port = Number.parseInt(process.env.PORT || "8000", 10);

module.exports = {
  port: Number.isFinite(port) ? port : 8000,
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  databaseFile: resolveDatabaseFile(process.env.DATABASE_FILE),
  blockchain,
};
