const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying WorkforceLogger...");

    const WorkforceLogger = await hre.ethers.getContractFactory("WorkforceLogger");
    const logger = await WorkforceLogger.deploy();

    await logger.waitForDeployment();
    const address = await logger.getAddress();

    console.log(`✅ WorkforceLogger deployed to: ${address}`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Copy the contract address above`);
    console.log(`   2. Set VITE_CONTRACT_ADDRESS=${address} in your .env`);
    console.log(`   3. Restart the frontend`);
    console.log(`\n🔗 View on Etherscan: https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
