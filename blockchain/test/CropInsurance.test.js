const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CropInsurance", function () {
  let cropInsurance;
  let owner, farmer, oracle;

  beforeEach(async function () {
    [owner, farmer, oracle] = await ethers.getSigners();

    const CropInsurance = await ethers.getContractFactory("CropInsurance");
    cropInsurance = await CropInsurance.deploy();
    await cropInsurance.waitForDeployment();

    // Fund insurance pool
    await cropInsurance.connect(owner).fundPool({ value: ethers.parseEther("100") });
    await cropInsurance.connect(owner).registerOracle(oracle.address);
  });

  describe("Policy Purchase", function () {
    it("should allow purchasing an insurance policy", async function () {
      const coverage = ethers.parseEther("10");
      const premium = (coverage * BigInt(3)) / BigInt(100);

      const tx = await cropInsurance.connect(farmer).purchasePolicy(
        1, "Wheat", coverage, 180, "Maharashtra", 10,
        { value: premium }
      );

      await expect(tx).to.emit(cropInsurance, "PolicyCreated");

      const policy = await cropInsurance.policies(1);
      expect(policy.farmer).to.equal(farmer.address);
      expect(policy.coverageAmount).to.equal(coverage);
    });

    it("should reject insufficient premium", async function () {
      const coverage = ethers.parseEther("10");

      await expect(
        cropInsurance.connect(farmer).purchasePolicy(
          1, "Rice", coverage, 180, "Punjab", 5,
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("CropInsurance: Insufficient premium");
    });
  });

  describe("Weather Oracle", function () {
    it("should accept weather data from authorized oracle", async function () {
      const tx = await cropInsurance.connect(oracle).submitWeatherData(
        "Maharashtra", 1, 500, 4200, 1500 // Drought condition
      );

      await expect(tx).to.emit(cropInsurance, "WeatherDataSubmitted");
    });

    it("should reject weather data from unauthorized oracle", async function () {
      await expect(
        cropInsurance.connect(farmer).submitWeatherData(
          "Maharashtra", 1, 500, 4200, 1500
        )
      ).to.be.revertedWith("CropInsurance: Not an authorized oracle");
    });
  });

  describe("Claims", function () {
    it("should allow filing and approving a claim", async function () {
      const coverage = ethers.parseEther("1");
      const premium = (coverage * BigInt(3)) / BigInt(100);

      await cropInsurance.connect(farmer).purchasePolicy(
        1, "Cotton", coverage, 180, "Gujarat", 5,
        { value: premium }
      );

      // File claim
      await cropInsurance.connect(farmer).fileClaim(1, 1, 12345); // Drought

      // Approve claim
      const balanceBefore = await ethers.provider.getBalance(farmer.address);
      await cropInsurance.connect(owner).approveClaim(1);
      const balanceAfter = await ethers.provider.getBalance(farmer.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});
