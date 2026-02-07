require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: process.env.AGENT_WALLET_PRIVATE_KEY
                ? [process.env.AGENT_WALLET_PRIVATE_KEY]
                : [],
            gasPrice: 10000000000
        },
        bscMainnet: {
            url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
            chainId: 56,
            accounts: process.env.AGENT_WALLET_PRIVATE_KEY
                ? [process.env.AGENT_WALLET_PRIVATE_KEY]
                : [],
            gasPrice: 3000000000
        },
        hardhat: {
            chainId: 31337
        }
    },
    etherscan: {
        apiKey: {
            bsc: process.env.BSCSCAN_API_KEY || "",
            bscTestnet: process.env.BSCSCAN_API_KEY || ""
        }
    },
    paths: {
        sources: "./contracts",
        scripts: "./scripts",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
