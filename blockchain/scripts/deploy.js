const hre = require("hardhat");

async function main() {
  console.log("🚜 Deploying AgriChain Smart Contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy AgriToken
  console.log("\n📦 Deploying AgriToken (AGRI)...");
  const AgriToken = await hre.ethers.getContractFactory("AgriToken");
  const agriToken = await AgriToken.deploy();
  await agriToken.waitForDeployment();
  const agriTokenAddress = await agriToken.getAddress();
  console.log("✅ AgriToken deployed to:", agriTokenAddress);

  // Deploy AgriChain (Supply Chain)
  console.log("\n🔗 Deploying AgriChain Supply Chain...");
  const AgriChain = await hre.ethers.getContractFactory("AgriChain");
  const agriChain = await AgriChain.deploy();
  await agriChain.waitForDeployment();
  const agriChainAddress = await agriChain.getAddress();
  console.log("✅ AgriChain deployed to:", agriChainAddress);

  // Deploy CropInsurance
  console.log("\n🛡️ Deploying CropInsurance...");
  const CropInsurance = await hre.ethers.getContractFactory("CropInsurance");
  const cropInsurance = await CropInsurance.deploy();
  await cropInsurance.waitForDeployment();
  const cropInsuranceAddress = await cropInsurance.getAddress();
  console.log("✅ CropInsurance deployed to:", cropInsuranceAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`AgriToken (AGRI) : ${agriTokenAddress}`);
  console.log(`AgriChain         : ${agriChainAddress}`);
  console.log(`CropInsurance     : ${cropInsuranceAddress}`);
  console.log("=".repeat(60));

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      AgriToken: agriTokenAddress,
      AgriChain: agriChainAddress,
      CropInsurance: cropInsuranceAddress,
    },
    deployer: deployer.address,
  };

  fs.writeFileSync(
    `./deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`\n📝 Deployment data saved to ./deployments/${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
