import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "dotenv/config";

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
      url: process.env.RPC_URL || "https://yellowstone-rpc.litprotocol.com/",
      chainId: 175177,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
    alwaysGenerateOverloads: true,
    externalArtifacts: ["./artifacts/@openzeppelin/**/+([a-zA-Z0-9_]).json"]
  }
};

export default config; 