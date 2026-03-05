// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgriToken (AGRI) - Utility Token for AgriChain Ecosystem
 * @dev ERC-20 token used for rewards, staking, and governance
 * @author AgriChain Team
 */
contract AgriToken is ERC20, Ownable {

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M tokens

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public rewardsEarned;

    uint256 public stakingRewardRate = 5; // 5% annual
    uint256 public totalStaked;

    // Reward distribution for ecosystem participants
    uint256 public farmerRewardPerBatch = 100 * 10**18;    // 100 AGRI per batch
    uint256 public buyerRewardPerPurchase = 50 * 10**18;   // 50 AGRI per purchase
    uint256 public inspectorRewardPerCheck = 25 * 10**18;  // 25 AGRI per quality check

    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardDistributed(address indexed user, uint256 amount, string reason);

    constructor() ERC20("AgriChain Token", "AGRI") {
        _mint(msg.sender, 10_000_000 * 10**18); // Initial supply: 10M
    }

    /**
     * @dev Mint reward tokens to ecosystem participants
     */
    function mintReward(address _to, uint256 _amount, string memory _reason) external onlyOwner {
        require(totalSupply() + _amount <= MAX_SUPPLY, "AgriToken: Would exceed max supply");
        _mint(_to, _amount);
        rewardsEarned[_to] += _amount;
        emit RewardDistributed(_to, _amount, _reason);
    }

    /**
     * @dev Stake AGRI tokens
     */
    function stake(uint256 _amount) external {
        require(_amount > 0, "AgriToken: Cannot stake 0");
        require(balanceOf(msg.sender) >= _amount, "AgriToken: Insufficient balance");

        // Claim pending rewards before staking more
        if (stakedBalance[msg.sender] > 0) {
            _claimRewards(msg.sender);
        }

        _transfer(msg.sender, address(this), _amount);
        stakedBalance[msg.sender] += _amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        totalStaked += _amount;

        emit TokensStaked(msg.sender, _amount);
    }

    /**
     * @dev Unstake AGRI tokens with rewards
     */
    function unstake(uint256 _amount) external {
        require(stakedBalance[msg.sender] >= _amount, "AgriToken: Insufficient staked balance");

        uint256 reward = _calculateReward(msg.sender);

        stakedBalance[msg.sender] -= _amount;
        totalStaked -= _amount;

        _transfer(address(this), msg.sender, _amount);

        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(msg.sender, reward);
            rewardsEarned[msg.sender] += reward;
        }

        stakingTimestamp[msg.sender] = block.timestamp;

        emit TokensUnstaked(msg.sender, _amount, reward);
    }

    /**
     * @dev Calculate pending staking rewards
     */
    function _calculateReward(address _user) internal view returns (uint256) {
        if (stakedBalance[_user] == 0) return 0;

        uint256 stakingDuration = block.timestamp - stakingTimestamp[_user];
        uint256 annualReward = (stakedBalance[_user] * stakingRewardRate) / 100;
        uint256 reward = (annualReward * stakingDuration) / 365 days;

        return reward;
    }

    /**
     * @dev Claim staking rewards without unstaking
     */
    function _claimRewards(address _user) internal {
        uint256 reward = _calculateReward(_user);
        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(_user, reward);
            rewardsEarned[_user] += reward;
        }
        stakingTimestamp[_user] = block.timestamp;
    }

    /**
     * @dev View pending rewards
     */
    function pendingRewards(address _user) external view returns (uint256) {
        return _calculateReward(_user);
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
