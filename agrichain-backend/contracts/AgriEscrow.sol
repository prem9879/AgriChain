// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgriEscrow {
    address public owner;

    enum TradeState {
        None,
        Confirmed,
        Delivered,
        Locked,
        Released
    }

    struct TradeRecord {
        bytes32 agreementHash;
        bytes32 deliveryHash;
        uint256 amountPaise;
        TradeState state;
        bool exists;
    }

    mapping(string => TradeRecord) private trades;
    mapping(string => bytes32) public proofHashes;

    event TradeAnchored(string indexed tradeId, bytes32 agreementHash, uint256 amountPaise);
    event DeliveryConfirmed(string indexed tradeId, bytes32 deliveryHash);
    event EscrowLocked(string indexed tradeId);
    event EscrowReleased(string indexed tradeId);
    event ProofAnchored(string indexed proofId, bytes32 proofHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        owner = newOwner;
    }

    function anchorTrade(string calldata tradeId, bytes32 agreementHash, uint256 amountPaise) external onlyOwner {
        require(!trades[tradeId].exists, "trade exists");

        trades[tradeId] = TradeRecord({
            agreementHash: agreementHash,
            deliveryHash: bytes32(0),
            amountPaise: amountPaise,
            state: TradeState.Confirmed,
            exists: true
        });

        emit TradeAnchored(tradeId, agreementHash, amountPaise);
    }

    function confirmDelivery(string calldata tradeId, bytes32 deliveryHash) external onlyOwner {
        TradeRecord storage trade = trades[tradeId];
        require(trade.exists, "trade missing");
        require(
            trade.state == TradeState.Confirmed || trade.state == TradeState.Delivered,
            "invalid state"
        );

        trade.deliveryHash = deliveryHash;
        trade.state = TradeState.Delivered;

        emit DeliveryConfirmed(tradeId, deliveryHash);
    }

    function lockEscrow(string calldata tradeId) external onlyOwner {
        TradeRecord storage trade = trades[tradeId];
        require(trade.exists, "trade missing");
        require(
            trade.state == TradeState.Confirmed || trade.state == TradeState.Delivered,
            "invalid state"
        );

        trade.state = TradeState.Locked;
        emit EscrowLocked(tradeId);
    }

    function releaseEscrow(string calldata tradeId) external onlyOwner {
        TradeRecord storage trade = trades[tradeId];
        require(trade.exists, "trade missing");
        require(trade.state == TradeState.Locked, "not locked");

        trade.state = TradeState.Released;
        emit EscrowReleased(tradeId);
    }

    function anchorProof(string calldata proofId, bytes32 proofHash) external onlyOwner {
        require(proofHashes[proofId] == bytes32(0), "proof exists");
        proofHashes[proofId] = proofHash;
        emit ProofAnchored(proofId, proofHash);
    }

    function getTrade(string calldata tradeId)
        external
        view
        returns (
            bytes32 agreementHash,
            bytes32 deliveryHash,
            uint256 amountPaise,
            TradeState state,
            bool exists
        )
    {
        TradeRecord storage trade = trades[tradeId];
        return (
            trade.agreementHash,
            trade.deliveryHash,
            trade.amountPaise,
            trade.state,
            trade.exists
        );
    }
}
