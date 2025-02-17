import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
  } from "@virtuals-protocol/game";
  import { LitDelegateeSigner } from "./litDelegateeSigner";
  
  export const erc20TransferFunction = (
    litDelegatee: LitDelegateeSigner
  ) =>
    new GameFunction({
      name: "transfer_erc20",
      description: "Transfer ERC20 tokens using the PKP-based LitDelegatee",
      args: [
        { name: "tokenAddress", description: "ERC20 token address" },
        { name: "recipient", description: "Recipient address" },
        { name: "amount", description: "Amount of tokens (as string)" },
      ] as const,
  
      executable: async (args: {
        tokenAddress: string;
        recipient: string;
        amount: string;
      }, logger: (message: string) => void) => {
        try {
          logger(`Attempting ERC20 transfer: ${args.amount} -> ${args.recipient}`);
          // Call the bridging layer
          const result = await litDelegatee.transferERC20(
            args.tokenAddress,
            args.recipient,
            args.amount
          );
  
          if (!result.success) {
            throw new Error(result.errorMessage || "Unknown transfer error");
          }
  
          logger(`Transfer success. Tx Hash: ${result.hash}`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            `ERC20 transfer completed. TxHash: ${result.hash}`
          );
        } catch (e: any) {
          logger(`Transfer failed: ${e.message}`);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            e.message
          );
        }
      },
    });
  