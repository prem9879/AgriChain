const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriToken (AGRI)", function () {
  let agriToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AgriToken = await ethers.getContractFactory("AgriToken");
    agriToken = await AgriToken.deploy();
    await agriToken.waitForDeployment();
  });

  describe("Token Basics", function () {
    it("should have correct name and symbol", async function () {
      expect(await agriToken.name()).to.equal("AgriChain Token");
      expect(await agriToken.symbol()).to.equal("AGRI");
    });

    it("should mint initial supply to deployer", async function () {
      const balance = await agriToken.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("10000000")); // 10M
    });

    it("should have max supply of 100M", async function () {
      expect(await agriToken.MAX_SUPPLY()).to.equal(ethers.parseEther("100000000"));
    });
  });

  describe("Staking", function () {
    it("should allow staking tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      await agriToken.connect(owner).stake(stakeAmount);

      expect(await agriToken.stakedBalance(owner.address)).to.equal(stakeAmount);
      expect(await agriToken.totalStaked()).to.equal(stakeAmount);
    });

    it("should allow unstaking with rewards", async function () {
      const stakeAmount = ethers.parseEther("10000");
      await agriToken.connect(owner).stake(stakeAmount);

      // Advance time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const balanceBefore = await agriToken.balanceOf(owner.address);
      await agriToken.connect(owner).unstake(stakeAmount);
      const balanceAfter = await agriToken.balanceOf(owner.address);

      // Should receive staked amount + rewards
      expect(balanceAfter).to.be.gt(balanceBefore + stakeAmount - BigInt(1));
    });
  });

  describe("Rewards", function () {
    it("should mint reward tokens", async function () {
      await agriToken.connect(owner).mintReward(
        user1.address,
        ethers.parseEther("100"),
        "Batch creation reward"
      );

      expect(await agriToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
      expect(await agriToken.rewardsEarned(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("should not exceed max supply", async function () {
      await expect(
        agriToken.connect(owner).mintReward(
          user1.address,
          ethers.parseEther("100000000"), // 100M (exceeds remaining supply)
          "Too much"
        )
      ).to.be.revertedWith("AgriToken: Would exceed max supply");
    });
  });

  describe("Burning", function () {
    it("should allow token burning", async function () {
      const burnAmount = ethers.parseEther("1000");
      const supplyBefore = await agriToken.totalSupply();

      await agriToken.connect(owner).burn(burnAmount);

      expect(await agriToken.totalSupply()).to.equal(supplyBefore - burnAmount);
    });
  });
});
