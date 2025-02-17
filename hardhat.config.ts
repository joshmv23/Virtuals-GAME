import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  paths: {
    sources: "./src/contracts",
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    chronicle: {
      url: "https://yellowstone-rpc.litprotocol.com/",
      chainId: 175188,  // Chronicle Yellowstone testnet
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  }
};

export default config; 