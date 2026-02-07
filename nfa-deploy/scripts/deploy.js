const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying ChainMindX NFA to", hre.network.name, "...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", hre.ethers.formatEther(balance), "BNB\n");

    // Deploy contract
    console.log("📦 Deploying ChainMindNFA contract...");
    const ChainMindNFA = await hre.ethers.getContractFactory("ChainMindNFA");
    const nfa = await ChainMindNFA.deploy();
    await nfa.waitForDeployment();

    const contractAddress = await nfa.getAddress();
    console.log("✅ ChainMindNFA deployed to:", contractAddress);

    // ============================================
    // UPDATE THIS WITH YOUR IPFS CID
    // ============================================
    const IPFS_CID = "bafybeibero5odocquphcc3sn4fzt2fo52g3wcahoeh4rngetln4se6qh2i"; // ChainMindX metadata
    const metadataURI = `ipfs://${IPFS_CID}/chainmindx-metadata.json`;

    // ChainMindX capabilities from metadata
    const capabilities = [
        "defi-analytics",
        "trading",
        "portfolio-management",
        "on-chain-research",
        "social-posting",
        "autonomous-decisions"
    ];

    // Mint ChainMindX NFA
    console.log("\n🤖 Minting ChainMindX NFA...");
    console.log("   Metadata URI:", metadataURI);
    console.log("   Capabilities:", capabilities.length, "skills");

    const mintTx = await nfa.mint(
        deployer.address,
        metadataURI,
        capabilities
    );
    await mintTx.wait();

    console.log("✅ ChainMindX NFA minted! Token ID: 0");

    // Verify agent state
    const state = await nfa.getAgentState(0);
    console.log("\n📊 Agent State:");
    console.log("   Active:", state.active);
    console.log("   Action Count:", state.actionCount.toString());

    const caps = await nfa.getAgentCapabilities(0);
    console.log("   Capabilities:", caps.join(", "));

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\n📋 Save these values to your .env file:\n");
    console.log(`NFA_CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`NFA_TOKEN_ID=0`);
    console.log(`\n🔗 View on BSCScan:`);

    if (hre.network.name === "bscTestnet") {
        console.log(`   https://testnet.bscscan.com/address/${contractAddress}`);
    } else if (hre.network.name === "bscMainnet") {
        console.log(`   https://bscscan.com/address/${contractAddress}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
