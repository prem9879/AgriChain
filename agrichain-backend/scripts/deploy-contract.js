const hre = require("hardhat");

async function main() {
  const factory = await hre.ethers.getContractFactory("AgriEscrow");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("AgriEscrow deployed");
  console.log(`NETWORK=${hre.network.name}`);
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
