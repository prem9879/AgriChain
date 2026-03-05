const crypto = require("crypto");
const { ethers } = require("ethers");
const { blockchain } = require("../config");
const { AGRI_ESCROW_ABI } = require("./escrowAbi");

class BlockchainClient {
  constructor() {
    this.networkName = blockchain.networkName;
    this.explorerTxBase = blockchain.explorerTxBase;
    this.explorerAddressBase = blockchain.explorerAddressBase;
    this.live = this.createLiveClient();
  }

  createLiveClient() {
    if (!blockchain.liveEnabled) {
      return null;
    }

    try {
      const provider = new ethers.JsonRpcProvider(blockchain.rpcUrl);
      const signer = new ethers.Wallet(blockchain.privateKey, provider);
      const contract = new ethers.Contract(blockchain.contractAddress, AGRI_ESCROW_ABI, signer);
      return { provider, signer, contract };
    } catch (error) {
      console.error("[blockchain] Failed to initialize live client. Falling back to simulation.");
      console.error(error.message);
      return null;
    }
  }

  get isLive() {
    return Boolean(this.live);
  }

  buildExplorerTxUrl(txHash) {
    if (!this.explorerTxBase) {
      return null;
    }
    return `${this.explorerTxBase.replace(/\/$/, "")}/${txHash}`;
  }

  buildExplorerAddressUrl(address) {
    if (!this.explorerAddressBase) {
      return null;
    }
    return `${this.explorerAddressBase.replace(/\/$/, "")}/${address}`;
  }

  randomTxHash() {
    return `0x${crypto.randomBytes(32).toString("hex")}`;
  }

  simulatedTx(label) {
    const txHash = this.randomTxHash();
    return {
      tx_hash: txHash,
      explorer_url: this.buildExplorerTxUrl(txHash),
      blockchain_live: false,
      network: this.networkName,
      mode: "simulation",
      note: `simulated:${label}`,
    };
  }

  async execute(label, callback) {
    if (!this.live) {
      return this.simulatedTx(label);
    }

    try {
      const tx = await callback(this.live.contract);
      const receipt = await tx.wait();
      return {
        tx_hash: tx.hash,
        explorer_url: this.buildExplorerTxUrl(tx.hash),
        blockchain_live: true,
        network: this.networkName,
        mode: "live",
        block_number: receipt?.blockNumber ?? null,
      };
    } catch (error) {
      console.error(`[blockchain] ${label} failed in live mode. Falling back to simulation.`);
      console.error(error.message);
      const fallback = this.simulatedTx(label);
      fallback.degraded = true;
      fallback.error = error.message;
      return fallback;
    }
  }

  async anchorTrade({ tradeId, agreementHash, totalAmountRupees }) {
    const amountPaise = Math.max(0, Math.round(Number(totalAmountRupees || 0) * 100));
    return this.execute("anchorTrade", (contract) =>
      contract.anchorTrade(tradeId, agreementHash, amountPaise)
    );
  }

  async confirmDelivery({ tradeId, deliveryHash }) {
    return this.execute("confirmDelivery", (contract) =>
      contract.confirmDelivery(tradeId, deliveryHash)
    );
  }

  async lockEscrow({ tradeId }) {
    return this.execute("lockEscrow", (contract) => contract.lockEscrow(tradeId));
  }

  async releaseEscrow({ tradeId }) {
    return this.execute("releaseEscrow", (contract) => contract.releaseEscrow(tradeId));
  }

  async anchorProof({ proofId, proofHash }) {
    return this.execute("anchorProof", (contract) => contract.anchorProof(proofId, proofHash));
  }
}

module.exports = new BlockchainClient();
