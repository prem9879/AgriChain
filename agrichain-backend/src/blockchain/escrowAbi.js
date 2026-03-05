const AGRI_ESCROW_ABI = [
  "function anchorTrade(string tradeId, bytes32 agreementHash, uint256 amountPaise)",
  "function confirmDelivery(string tradeId, bytes32 deliveryHash)",
  "function lockEscrow(string tradeId)",
  "function releaseEscrow(string tradeId)",
  "function anchorProof(string proofId, bytes32 proofHash)",
  "event TradeAnchored(string indexed tradeId, bytes32 agreementHash, uint256 amountPaise)",
  "event DeliveryConfirmed(string indexed tradeId, bytes32 deliveryHash)",
  "event EscrowLocked(string indexed tradeId)",
  "event EscrowReleased(string indexed tradeId)",
  "event ProofAnchored(string indexed proofId, bytes32 proofHash)"
];

module.exports = { AGRI_ESCROW_ABI };
