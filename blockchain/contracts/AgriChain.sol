// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AgriChain - Agricultural Supply Chain on Blockchain
 * @dev Tracks produce from farm to consumer with full traceability
 * @author AgriChain Team
 */
contract AgriChain is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _batchIds;
    Counters.Counter private _transactionIds;

    enum ProduceStatus {
        Planted,
        Growing,
        Harvested,
        InTransit,
        AtWarehouse,
        QualityChecked,
        Listed,
        Sold,
        Delivered
    }

    enum CropType {
        Wheat,
        Rice,
        Corn,
        Soybean,
        Cotton,
        Sugarcane,
        Vegetables,
        Fruits,
        Spices,
        Pulses
    }

    struct Farm {
        uint256 farmId;
        address owner;
        string name;
        string location;
        uint256 areaInAcres;
        string soilType;
        bool isVerified;
        uint256 registeredAt;
    }

    struct ProduceBatch {
        uint256 batchId;
        uint256 farmId;
        CropType cropType;
        string cropVariety;
        uint256 quantity; // in kilograms
        uint256 harvestDate;
        ProduceStatus status;
        uint256 pricePerKg; // in wei
        address currentHolder;
        string qualityGrade;
        string[] certifications;
        uint256 createdAt;
    }

    struct SupplyChainEvent {
        uint256 eventId;
        uint256 batchId;
        ProduceStatus fromStatus;
        ProduceStatus toStatus;
        address actor;
        string location;
        string notes;
        uint256 temperature; // stored as temp * 100 for precision
        uint256 humidity;
        uint256 timestamp;
    }

    struct Transaction {
        uint256 transactionId;
        uint256 batchId;
        address seller;
        address buyer;
        uint256 quantity;
        uint256 totalPrice;
        uint256 timestamp;
        bool isCompleted;
    }

    // State variables
    mapping(uint256 => Farm) public farms;
    mapping(uint256 => ProduceBatch) public batches;
    mapping(uint256 => SupplyChainEvent[]) public batchEvents;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public farmerBatches;
    mapping(address => uint256) public farmerFarmIds;
    mapping(address => bool) public verifiedFarmers;
    mapping(address => bool) public verifiedBuyers;
    mapping(address => bool) public qualityInspectors;

    uint256 public totalFarms;
    uint256 public totalBatches;
    uint256 public platformFeePercent = 2; // 2% platform fee

    // Events
    event FarmRegistered(uint256 indexed farmId, address indexed owner, string name);
    event FarmerVerified(address indexed farmer);
    event BatchCreated(uint256 indexed batchId, uint256 indexed farmId, CropType cropType, uint256 quantity);
    event StatusUpdated(uint256 indexed batchId, ProduceStatus fromStatus, ProduceStatus toStatus, address indexed actor);
    event ProduceListed(uint256 indexed batchId, uint256 pricePerKg);
    event ProduceSold(uint256 indexed batchId, address indexed buyer, uint256 quantity, uint256 totalPrice);
    event QualityChecked(uint256 indexed batchId, string grade, address indexed inspector);
    event PaymentReleased(uint256 indexed transactionId, address indexed seller, uint256 amount);

    // Modifiers
    modifier onlyVerifiedFarmer() {
        require(verifiedFarmers[msg.sender], "AgriChain: Not a verified farmer");
        _;
    }

    modifier onlyVerifiedBuyer() {
        require(verifiedBuyers[msg.sender], "AgriChain: Not a verified buyer");
        _;
    }

    modifier onlyQualityInspector() {
        require(qualityInspectors[msg.sender], "AgriChain: Not a quality inspector");
        _;
    }

    modifier batchExists(uint256 _batchId) {
        require(_batchId > 0 && _batchId <= _batchIds.current(), "AgriChain: Batch does not exist");
        _;
    }

    constructor() {
        qualityInspectors[msg.sender] = true;
    }

    /**
     * @dev Register a new farm on the blockchain
     */
    function registerFarm(
        string memory _name,
        string memory _location,
        uint256 _areaInAcres,
        string memory _soilType
    ) external returns (uint256) {
        totalFarms++;
        farms[totalFarms] = Farm({
            farmId: totalFarms,
            owner: msg.sender,
            name: _name,
            location: _location,
            areaInAcres: _areaInAcres,
            soilType: _soilType,
            isVerified: false,
            registeredAt: block.timestamp
        });

        farmerFarmIds[msg.sender] = totalFarms;
        emit FarmRegistered(totalFarms, msg.sender, _name);
        return totalFarms;
    }

    /**
     * @dev Verify a farmer (only owner can verify)
     */
    function verifyFarmer(address _farmer) external onlyOwner {
        verifiedFarmers[_farmer] = true;
        farms[farmerFarmIds[_farmer]].isVerified = true;
        emit FarmerVerified(_farmer);
    }

    /**
     * @dev Register a verified buyer
     */
    function registerBuyer(address _buyer) external onlyOwner {
        verifiedBuyers[_buyer] = true;
    }

    /**
     * @dev Add a quality inspector
     */
    function addQualityInspector(address _inspector) external onlyOwner {
        qualityInspectors[_inspector] = true;
    }

    /**
     * @dev Create a new produce batch
     */
    function createBatch(
        CropType _cropType,
        string memory _cropVariety,
        uint256 _quantity,
        uint256 _harvestDate
    ) external onlyVerifiedFarmer returns (uint256) {
        _batchIds.increment();
        uint256 newBatchId = _batchIds.current();

        string[] memory emptyCerts;

        batches[newBatchId] = ProduceBatch({
            batchId: newBatchId,
            farmId: farmerFarmIds[msg.sender],
            cropType: _cropType,
            cropVariety: _cropVariety,
            quantity: _quantity,
            harvestDate: _harvestDate,
            status: ProduceStatus.Harvested,
            pricePerKg: 0,
            currentHolder: msg.sender,
            qualityGrade: "",
            certifications: emptyCerts,
            createdAt: block.timestamp
        });

        farmerBatches[msg.sender].push(newBatchId);
        totalBatches++;

        _recordEvent(newBatchId, ProduceStatus.Planted, ProduceStatus.Harvested, "Farm", "Initial batch creation");

        emit BatchCreated(newBatchId, farmerFarmIds[msg.sender], _cropType, _quantity);
        return newBatchId;
    }

    /**
     * @dev Update the status of a produce batch along the supply chain
     */
    function updateBatchStatus(
        uint256 _batchId,
        ProduceStatus _newStatus,
        string memory _location,
        string memory _notes,
        uint256 _temperature,
        uint256 _humidity
    ) external batchExists(_batchId) {
        ProduceBatch storage batch = batches[_batchId];
        require(
            batch.currentHolder == msg.sender || qualityInspectors[msg.sender] || owner() == msg.sender,
            "AgriChain: Not authorized"
        );

        ProduceStatus oldStatus = batch.status;
        batch.status = _newStatus;

        batchEvents[_batchId].push(SupplyChainEvent({
            eventId: batchEvents[_batchId].length + 1,
            batchId: _batchId,
            fromStatus: oldStatus,
            toStatus: _newStatus,
            actor: msg.sender,
            location: _location,
            notes: _notes,
            temperature: _temperature,
            humidity: _humidity,
            timestamp: block.timestamp
        }));

        emit StatusUpdated(_batchId, oldStatus, _newStatus, msg.sender);
    }

    /**
     * @dev Quality inspector grades a batch
     */
    function qualityCheck(
        uint256 _batchId,
        string memory _grade
    ) external onlyQualityInspector batchExists(_batchId) {
        ProduceBatch storage batch = batches[_batchId];
        batch.qualityGrade = _grade;
        batch.status = ProduceStatus.QualityChecked;

        _recordEvent(_batchId, batch.status, ProduceStatus.QualityChecked, "Quality Lab", string(abi.encodePacked("Grade: ", _grade)));

        emit QualityChecked(_batchId, _grade, msg.sender);
    }

    /**
     * @dev List produce for sale on the marketplace
     */
    function listProduce(
        uint256 _batchId,
        uint256 _pricePerKg
    ) external onlyVerifiedFarmer batchExists(_batchId) {
        ProduceBatch storage batch = batches[_batchId];
        require(batch.currentHolder == msg.sender, "AgriChain: Not the batch holder");
        require(batch.status == ProduceStatus.QualityChecked, "AgriChain: Batch not quality checked");

        batch.pricePerKg = _pricePerKg;
        batch.status = ProduceStatus.Listed;

        emit ProduceListed(_batchId, _pricePerKg);
    }

    /**
     * @dev Buy produce from the marketplace
     */
    function buyProduce(
        uint256 _batchId,
        uint256 _quantity
    ) external payable onlyVerifiedBuyer batchExists(_batchId) nonReentrant {
        ProduceBatch storage batch = batches[_batchId];
        require(batch.status == ProduceStatus.Listed, "AgriChain: Batch not listed for sale");
        require(_quantity <= batch.quantity, "AgriChain: Insufficient quantity");

        uint256 totalPrice = _quantity * batch.pricePerKg;
        require(msg.value >= totalPrice, "AgriChain: Insufficient payment");

        _transactionIds.increment();
        uint256 txnId = _transactionIds.current();

        transactions[txnId] = Transaction({
            transactionId: txnId,
            batchId: _batchId,
            seller: batch.currentHolder,
            buyer: msg.sender,
            quantity: _quantity,
            totalPrice: totalPrice,
            timestamp: block.timestamp,
            isCompleted: false
        });

        batch.quantity -= _quantity;
        if (batch.quantity == 0) {
            batch.status = ProduceStatus.Sold;
            batch.currentHolder = msg.sender;
        }

        // Calculate platform fee and seller amount
        uint256 platformFee = (totalPrice * platformFeePercent) / 100;
        uint256 sellerAmount = totalPrice - platformFee;

        // Transfer funds to seller
        payable(transactions[txnId].seller).transfer(sellerAmount);
        transactions[txnId].isCompleted = true;

        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit ProduceSold(_batchId, msg.sender, _quantity, totalPrice);
        emit PaymentReleased(txnId, transactions[txnId].seller, sellerAmount);
    }

    /**
     * @dev Get the full supply chain trail for a batch
     */
    function getBatchTrail(uint256 _batchId) external view batchExists(_batchId) returns (SupplyChainEvent[] memory) {
        return batchEvents[_batchId];
    }

    /**
     * @dev Get all batch IDs for a farmer
     */
    function getFarmerBatches(address _farmer) external view returns (uint256[] memory) {
        return farmerBatches[_farmer];
    }

    /**
     * @dev Internal helper to record supply chain events
     */
    function _recordEvent(
        uint256 _batchId,
        ProduceStatus _from,
        ProduceStatus _to,
        string memory _location,
        string memory _notes
    ) internal {
        batchEvents[_batchId].push(SupplyChainEvent({
            eventId: batchEvents[_batchId].length + 1,
            batchId: _batchId,
            fromStatus: _from,
            toStatus: _to,
            actor: msg.sender,
            location: _location,
            notes: _notes,
            temperature: 0,
            humidity: 0,
            timestamp: block.timestamp
        }));
    }

    /**
     * @dev Update platform fee percentage
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 10, "AgriChain: Fee too high");
        platformFeePercent = _newFee;
    }

    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AgriChain: No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    receive() external payable {}
}
