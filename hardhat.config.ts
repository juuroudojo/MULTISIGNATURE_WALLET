import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter"

dotenv.config();


const config: HardhatUserConfig = {
  solidity: "0.8.11",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    gorilla: {
      url: process.env.Goerli_API_KEY || "",
      gas: 8000000,
      gasPrice: 80000000,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    matic: {
      url: process.env.MUMBAI || "",
      accounts:
        process.env.MNEMONIC !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.Sepolia_API_KEY || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  gasReporter: {
    enabled: true,
  },

  etherscan: {
    apiKey: process.env.POLYGON_SCAN
  },

};

export default config;