/**
 * AgriChain Blockchain Service
 * Connects React Native app to deployed smart contracts
 */
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contract ABIs (simplified for mobile integration)
import AgriChainABI from '../../blockchain/artifacts/contracts/AgriChain.sol/AgriChain.json';
import AgriTokenABI from '../../blockchain/artifacts/contracts/AgriToken.sol/AgriToken.json';
import CropInsuranceABI from '../../blockchain/artifacts/contracts/CropInsurance.sol/CropInsurance.json';

// Contract addresses from deployment
const CONTRACT_ADDRESSES = {
  localhost: {
    AgriChain: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    AgriToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    CropInsurance: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  },
  sepolia: {
    AgriChain: process.env.SEPOLIA_AGRICHAIN_ADDRESS,
    AgriToken: process.env.SEPOLIA_AGRITOKEN_ADDRESS,
    CropInsurance: process.env.SEPOLIA_CROPINSURANCE_ADDRESS,
  },
  polygon: {
    AgriChain: process.env.POLYGON_AGRICHAIN_ADDRESS,
    AgriToken: process.env.POLYGON_AGRITOKEN_ADDRESS,
    CropInsurance: process.env.POLYGON_CROPINSURANCE_ADDRESS,
  },
};

const NETWORK = __DEV__ ? 'localhost' : 'polygon';
const RPC_URLS = {
  localhost: 'http://10.0.2.2:8545', // Android emulator
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2/demo',
  polygon: 'https://polygon-rpc.com',
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize blockchain connection
   */
  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(RPC_URLS[NETWORK]);
      
      // Load or create wallet
      const privateKey = await AsyncStorage.getItem('wallet_private_key');
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
      }

      // Initialize contract instances
      const addresses = CONTRACT_ADDRESSES[NETWORK];
      
      if (addresses.AgriChain) {
        this.contracts.agriChain = new ethers.Contract(
          addresses.AgriChain,
          AgriChainABI.abi,
          this.signer || this.provider
        );
      }

      if (addresses.AgriToken) {
        this.contracts.agriToken = new ethers.Contract(
          addresses.AgriToken,
          AgriTokenABI.abi,
          this.signer || this.provider
        );
      }

      if (addresses.CropInsurance) {
        this.contracts.cropInsurance = new ethers.Contract(
          addresses.CropInsurance,
          CropInsuranceABI.abi,
          this.signer || this.provider
        );
      }

      this.initialized = true;
      console.log('[BlockchainService] Initialized on', NETWORK);
      return true;
    } catch (error) {
      console.error('[BlockchainService] Init failed:', error);
      return false;
    }
  }

  /**
   * Create or import a wallet
   */
  async createWallet() {
    const wallet = ethers.Wallet.createRandom();
    await AsyncStorage.setItem('wallet_private_key', wallet.privateKey);
    await AsyncStorage.setItem('wallet_address', wallet.address);
    this.signer = wallet.connect(this.provider);
    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic.phrase,
    };
  }

  /**
   * Import wallet from mnemonic
   */
  async importWallet(mnemonic) {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    await AsyncStorage.setItem('wallet_private_key', wallet.privateKey);
    await AsyncStorage.setItem('wallet_address', wallet.address);
    this.signer = wallet.connect(this.provider);
    return wallet.address;
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    if (!this.signer) return '0';
    const balance = await this.provider.getBalance(this.signer.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get AGRI token balance
   */
  async getTokenBalance() {
    if (!this.signer || !this.contracts.agriToken) return '0';
    const balance = await this.contracts.agriToken.balanceOf(this.signer.address);
    return ethers.formatEther(balance);
  }

  // ==================== SUPPLY CHAIN ====================

  /**
   * Register farm on blockchain
   */
  async registerFarm(name, location, areaInAcres, soilType) {
    const tx = await this.contracts.agriChain.registerFarm(
      name, location, areaInAcres, soilType
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment?.name === 'FarmRegistered');
    return {
      txHash: receipt.hash,
      farmId: event?.args?.farmId?.toString(),
    };
  }

  /**
   * Create a produce batch on-chain
   */
  async createBatch(cropType, cropVariety, quantity, harvestDate) {
    const tx = await this.contracts.agriChain.createBatch(
      cropType, cropVariety, quantity, harvestDate
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Update batch status in supply chain
   */
  async updateBatchStatus(batchId, newStatus, location, notes, temperature, humidity) {
    const tx = await this.contracts.agriChain.updateBatchStatus(
      batchId, newStatus, location, notes,
      Math.round(temperature * 100),
      Math.round(humidity * 100)
    );
    return await tx.wait();
  }

  /**
   * Get full supply chain trail for a batch
   */
  async getBatchTrail(batchId) {
    const events = await this.contracts.agriChain.getBatchTrail(batchId);
    return events.map(event => ({
      eventId: event.eventId.toString(),
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      location: event.location,
      notes: event.notes,
      temperature: Number(event.temperature) / 100,
      humidity: Number(event.humidity) / 100,
      timestamp: new Date(Number(event.timestamp) * 1000),
    }));
  }

  /**
   * List produce on marketplace
   */
  async listProduce(batchId, pricePerKg) {
    const priceWei = ethers.parseEther(pricePerKg.toString());
    const tx = await this.contracts.agriChain.listProduce(batchId, priceWei);
    return await tx.wait();
  }

  /**
   * Buy produce from marketplace
   */
  async buyProduce(batchId, quantity, totalPrice) {
    const tx = await this.contracts.agriChain.buyProduce(batchId, quantity, {
      value: ethers.parseEther(totalPrice.toString()),
    });
    return await tx.wait();
  }

  // ==================== INSURANCE ====================

  /**
   * Purchase crop insurance
   */
  async purchaseInsurance(farmId, cropType, coverageAmount, durationDays, region, acres) {
    const coverage = ethers.parseEther(coverageAmount.toString());
    const premium = (coverage * BigInt(3)) / BigInt(100); // 3% premium

    const tx = await this.contracts.cropInsurance.purchasePolicy(
      farmId, cropType, coverage, durationDays, region, acres,
      { value: premium }
    );
    return await tx.wait();
  }

  /**
   * File insurance claim
   */
  async fileInsuranceClaim(policyId, reason, evidenceHash) {
    const tx = await this.contracts.cropInsurance.fileClaim(
      policyId, reason, evidenceHash
    );
    return await tx.wait();
  }

  // ==================== TOKENS & STAKING ====================

  /**
   * Stake AGRI tokens
   */
  async stakeTokens(amount) {
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await this.contracts.agriToken.stake(amountWei);
    return await tx.wait();
  }

  /**
   * Unstake AGRI tokens
   */
  async unstakeTokens(amount) {
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await this.contracts.agriToken.unstake(amountWei);
    return await tx.wait();
  }

  /**
   * Get staking info
   */
  async getStakingInfo() {
    if (!this.signer) return null;
    const address = this.signer.address;
    const [staked, pending, rewards] = await Promise.all([
      this.contracts.agriToken.stakedBalance(address),
      this.contracts.agriToken.pendingRewards(address),
      this.contracts.agriToken.rewardsEarned(address),
    ]);
    return {
      stakedBalance: ethers.formatEther(staked),
      pendingRewards: ethers.formatEther(pending),
      totalRewardsEarned: ethers.formatEther(rewards),
    };
  }

  /**
   * Verify a transaction on-chain
   */
  async verifyTransaction(txHash) {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    return {
      confirmed: receipt !== null,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }
}

export default new BlockchainService();
