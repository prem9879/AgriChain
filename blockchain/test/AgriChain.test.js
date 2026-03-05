const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgriChain Supply Chain", function () {
  let agriChain;
  let owner, farmer, buyer, inspector;

  beforeEach(async function () {
    [owner, farmer, buyer, inspector] = await ethers.getSigners();

    const AgriChain = await ethers.getContractFactory("AgriChain");
    agriChain = await AgriChain.deploy();
    await agriChain.waitForDeployment();
  });

  describe("Farm Registration", function () {
    it("should register a new farm", async function () {
      const tx = await agriChain.connect(farmer).registerFarm(
        "Green Valley Farm",
        "Maharashtra, India",
        50,
        "Black Cotton Soil"
      );

      await expect(tx)
        .to.emit(agriChain, "FarmRegistered")
        .withArgs(1, farmer.address, "Green Valley Farm");

      const farm = await agriChain.farms(1);
      expect(farm.name).to.equal("Green Valley Farm");
      expect(farm.owner).to.equal(farmer.address);
      expect(farm.areaInAcres).to.equal(50);
    });

    it("should verify a farmer", async function () {
      await agriChain.connect(farmer).registerFarm("Test Farm", "Gujarat", 10, "Alluvial");
      await agriChain.connect(owner).verifyFarmer(farmer.address);

      expect(await agriChain.verifiedFarmers(farmer.address)).to.be.true;
    });
  });

  describe("Batch Management", function () {
    beforeEach(async function () {
      await agriChain.connect(farmer).registerFarm("Test Farm", "Punjab", 20, "Loamy");
      await agriChain.connect(owner).verifyFarmer(farmer.address);
      await agriChain.connect(owner).registerBuyer(buyer.address);
      await agriChain.connect(owner).addQualityInspector(inspector.address);
    });

    it("should create a produce batch", async function () {
      const tx = await agriChain.connect(farmer).createBatch(
        0, // Wheat
        "HD-2967",
        5000, // 5000 kg
        Math.floor(Date.now() / 1000)
      );

      await expect(tx).to.emit(agriChain, "BatchCreated");

      const batch = await agriChain.batches(1);
      expect(batch.cropVariety).to.equal("HD-2967");
      expect(batch.quantity).to.equal(5000);
      expect(batch.status).to.equal(2); // Harvested
    });

    it("should update batch status through supply chain", async function () {
      await agriChain.connect(farmer).createBatch(0, "HD-2967", 5000, Math.floor(Date.now() / 1000));

      await agriChain.connect(farmer).updateBatchStatus(
        1, 3, "Highway NH-44", "In transit to warehouse", 2500, 6000
      );

      const batch = await agriChain.batches(1);
      expect(batch.status).to.equal(3); // InTransit
    });

    it("should perform quality check", async function () {
      await agriChain.connect(farmer).createBatch(0, "HD-2967", 5000, Math.floor(Date.now() / 1000));

      await agriChain.connect(inspector).qualityCheck(1, "A+");

      const batch = await agriChain.batches(1);
      expect(batch.qualityGrade).to.equal("A+");
    });

    it("should list and sell produce", async function () {
      await agriChain.connect(farmer).createBatch(0, "HD-2967", 5000, Math.floor(Date.now() / 1000));
      await agriChain.connect(inspector).qualityCheck(1, "A");

      // List for sale
      const pricePerKg = ethers.parseEther("0.001"); // 0.001 ETH per kg
      await agriChain.connect(farmer).listProduce(1, pricePerKg);

      // Buy produce
      const quantity = 1000;
      const totalPrice = pricePerKg * BigInt(quantity);

      await expect(
        agriChain.connect(buyer).buyProduce(1, quantity, { value: totalPrice })
      ).to.emit(agriChain, "ProduceSold");
    });

    it("should track full supply chain trail", async function () {
      await agriChain.connect(farmer).createBatch(1, "Basmati", 3000, Math.floor(Date.now() / 1000));
      await agriChain.connect(farmer).updateBatchStatus(1, 3, "NH-44", "Shipping", 2800, 5500);
      await agriChain.connect(farmer).updateBatchStatus(1, 4, "Delhi Warehouse", "Arrived", 2200, 6500);

      const trail = await agriChain.getBatchTrail(1);
      expect(trail.length).to.equal(3); // creation + 2 updates
    });
  });

  describe("Access Control", function () {
    it("should reject unverified farmer creating batch", async function () {
      await expect(
        agriChain.connect(farmer).createBatch(0, "Test", 100, Math.floor(Date.now() / 1000))
      ).to.be.revertedWith("AgriChain: Not a verified farmer");
    });

    it("should reject unverified buyer purchasing", async function () {
      await agriChain.connect(farmer).registerFarm("Farm", "Location", 10, "Soil");
      await agriChain.connect(owner).verifyFarmer(farmer.address);
      await agriChain.connect(owner).addQualityInspector(inspector.address);

      await agriChain.connect(farmer).createBatch(0, "Test", 100, Math.floor(Date.now() / 1000));
      await agriChain.connect(inspector).qualityCheck(1, "B");
      await agriChain.connect(farmer).listProduce(1, ethers.parseEther("0.001"));

      await expect(
        agriChain.connect(buyer).buyProduce(1, 10, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("AgriChain: Not a verified buyer");
    });
  });
});
