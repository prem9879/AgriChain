// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CropInsurance - Decentralized Crop Insurance Protocol
 * @dev Parametric crop insurance using on-chain weather oracles
 * @author AgriChain Team
 */
contract CropInsurance is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _policyIds;

    enum PolicyStatus {
        Active,
        ClaimFiled,
        ClaimApproved,
        ClaimRejected,
        Expired,
        Paid
    }

    enum WeatherCondition {
        Normal,
        Drought,
        Flood,
        Hailstorm,
        Frost,
        Cyclone
    }

    struct InsurancePolicy {
        uint256 policyId;
        address farmer;
        uint256 farmId;
        string cropType;
        uint256 coverageAmount;  // in wei
        uint256 premium;         // in wei
        uint256 startDate;
        uint256 endDate;
        PolicyStatus status;
        string region;
        uint256 acresCovered;
    }

    struct WeatherReport {
        uint256 reportId;
        string region;
        WeatherCondition condition;
        uint256 rainfall;       // mm * 100
        uint256 temperature;    // celsius * 100
        uint256 windSpeed;      // km/h * 100
        uint256 timestamp;
        address oracle;
        bool verified;
    }

    struct Claim {
        uint256 claimId;
        uint256 policyId;
        address farmer;
        WeatherCondition reason;
        uint256 evidenceHash;
        uint256 claimAmount;
        uint256 filedAt;
        bool approved;
    }

    // State
    mapping(uint256 => InsurancePolicy) public policies;
    mapping(uint256 => Claim) public claims;
    mapping(string => WeatherReport[]) public regionWeather;
    mapping(address => uint256[]) public farmerPolicies;
    mapping(address => bool) public authorizedOracles;

    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    uint256 public minPremiumRate = 3; // 3% of coverage

    // Events
    event PolicyCreated(uint256 indexed policyId, address indexed farmer, uint256 coverageAmount);
    event PremiumPaid(uint256 indexed policyId, uint256 amount);
    event ClaimFiled(uint256 indexed policyId, uint256 claimId, WeatherCondition reason);
    event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event WeatherDataSubmitted(string region, WeatherCondition condition, address oracle);
    event OracleRegistered(address indexed oracle);

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "CropInsurance: Not an authorized oracle");
        _;
    }

    constructor() {
        authorizedOracles[msg.sender] = true;
    }

    /**
     * @dev Register a weather oracle
     */
    function registerOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = true;
        emit OracleRegistered(_oracle);
    }

    /**
     * @dev Purchase a crop insurance policy
     */
    function purchasePolicy(
        uint256 _farmId,
        string memory _cropType,
        uint256 _coverageAmount,
        uint256 _durationDays,
        string memory _region,
        uint256 _acresCovered
    ) external payable returns (uint256) {
        uint256 requiredPremium = (_coverageAmount * minPremiumRate) / 100;
        require(msg.value >= requiredPremium, "CropInsurance: Insufficient premium");

        _policyIds.increment();
        uint256 newPolicyId = _policyIds.current();

        policies[newPolicyId] = InsurancePolicy({
            policyId: newPolicyId,
            farmer: msg.sender,
            farmId: _farmId,
            cropType: _cropType,
            coverageAmount: _coverageAmount,
            premium: msg.value,
            startDate: block.timestamp,
            endDate: block.timestamp + (_durationDays * 1 days),
            status: PolicyStatus.Active,
            region: _region,
            acresCovered: _acresCovered
        });

        farmerPolicies[msg.sender].push(newPolicyId);
        totalPremiumsCollected += msg.value;

        emit PolicyCreated(newPolicyId, msg.sender, _coverageAmount);
        emit PremiumPaid(newPolicyId, msg.value);

        return newPolicyId;
    }

    /**
     * @dev Submit weather data from an authorized oracle
     */
    function submitWeatherData(
        string memory _region,
        WeatherCondition _condition,
        uint256 _rainfall,
        uint256 _temperature,
        uint256 _windSpeed
    ) external onlyOracle {
        regionWeather[_region].push(WeatherReport({
            reportId: regionWeather[_region].length + 1,
            region: _region,
            condition: _condition,
            rainfall: _rainfall,
            temperature: _temperature,
            windSpeed: _windSpeed,
            timestamp: block.timestamp,
            oracle: msg.sender,
            verified: true
        }));

        emit WeatherDataSubmitted(_region, _condition, msg.sender);
    }

    /**
     * @dev File an insurance claim
     */
    function fileClaim(
        uint256 _policyId,
        WeatherCondition _reason,
        uint256 _evidenceHash
    ) external returns (uint256) {
        InsurancePolicy storage policy = policies[_policyId];
        require(policy.farmer == msg.sender, "CropInsurance: Not policy holder");
        require(policy.status == PolicyStatus.Active, "CropInsurance: Policy not active");
        require(block.timestamp <= policy.endDate, "CropInsurance: Policy expired");

        uint256 claimId = _policyId; // 1:1 mapping
        claims[claimId] = Claim({
            claimId: claimId,
            policyId: _policyId,
            farmer: msg.sender,
            reason: _reason,
            evidenceHash: _evidenceHash,
            claimAmount: policy.coverageAmount,
            filedAt: block.timestamp,
            approved: false
        });

        policy.status = PolicyStatus.ClaimFiled;
        emit ClaimFiled(_policyId, claimId, _reason);

        return claimId;
    }

    /**
     * @dev Approve and payout a claim (owner/DAO)
     */
    function approveClaim(uint256 _claimId) external onlyOwner {
        Claim storage claim = claims[_claimId];
        require(!claim.approved, "CropInsurance: Already approved");

        InsurancePolicy storage policy = policies[claim.policyId];
        require(policy.status == PolicyStatus.ClaimFiled, "CropInsurance: No claim filed");

        claim.approved = true;
        policy.status = PolicyStatus.Paid;

        uint256 payout = claim.claimAmount;
        totalClaimsPaid += payout;

        payable(claim.farmer).transfer(payout);

        emit ClaimApproved(_claimId, payout);
    }

    /**
     * @dev Get farmer's policies
     */
    function getFarmerPolicies(address _farmer) external view returns (uint256[] memory) {
        return farmerPolicies[_farmer];
    }

    /**
     * @dev Fund the insurance pool
     */
    function fundPool() external payable onlyOwner {}

    /**
     * @dev Get contract balance (insurance pool)
     */
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
