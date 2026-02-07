PS D:\ChainMind\nfa-deploy> npx hardhat run scripts/deploy.js --network bscTestnet --config hardhat.config.cjs
🚀 Deploying ChainMindX NFA to bscTestnet ...

📍 Deployer: 0x24a1d6497EdCBdA4b2ae36733417aF0369e8A0ca
💰 Balance: 0.0294103686 BNB

📦 Deploying ChainMindNFA contract...
✅ ChainMindNFA deployed to: 0xaF54F296ed68822B5Acb928c63193c3bDa595cF5

🤖 Minting ChainMindX NFA...
   Metadata URI: ipfs://bafybeibero5odocquphcc3sn4fzt2fo52g3wcahoeh4rngetln4se6qh2i/chainmindx-metadata.json
   Capabilities: 6 skills
✅ ChainMindX NFA minted! Token ID: 0

📊 Agent State:
   Active: true
   Action Count: 0
   Capabilities: defi-analytics, trading, portfolio-management, on-chain-research, social-posting, autonomous-decisions

==================================================
🎉 DEPLOYMENT COMPLETE!
==================================================

📋 Save these values to your .env file:

NFA_CONTRACT_ADDRESS=0xaF54F296ed68822B5Acb928c63193c3bDa595cF5
NFA_TOKEN_ID=0

🔗 View on BSCScan:
   https://testnet.bscscan.com/address/0xaF54F296ed68822B5Acb928c63193c3bDa595cF5
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76