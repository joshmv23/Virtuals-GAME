import { GameWorker } from "@virtuals-protocol/game";
import { erc20TransferFunction } from "./erc20TransferFunction";
import { LitDelegateeSigner } from "./litDelegateeSigner";

export const createOnChainWorker = (litDelegatee: LitDelegateeSigner) => {
  return new GameWorker({
    id: "on_chain_worker",
    name: "On-Chain Worker",
    description: "Handles secure on-chain tasks via PKP",
    functions: [
      // Pass the instance so each function can call litDelegateeSigner
      erc20TransferFunction(litDelegatee),
      // If you create more bridging functions (Uniswap swap, sign ECDSA, etc.),
      // you’d add them here too.
    ],
    getEnvironment: async () => {
      // Provide environment details to the worker if needed
      return {
        network: "mumbai-testnet",
      };
    },
  });
};
