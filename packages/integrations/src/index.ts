import "dotenv/config";
import { runGameAgent } from "./gameAgent";

// In a real setup, you do the Admin steps once using the `@lit-protocol/law-cli` CLI. 
// That is typically outside your code. Here, we’ll just mention it:

// 1. ADMIN opens CLI:   pnpm start:cli
// 2. ADMIN selects:     "Admin" role
// 3. ADMIN enters:      process.env.ADMIN_PRIVATE_KEY
// 4. ADMIN "Add Delegatee" with the address derived from process.env.DELEGATEE_PRIVATE_KEY
// 5. ADMIN "Permit Tools" (like "erc20-transfer") & set policies

// Now we just run the agent as the Delegatee inside code:
(async () => {
  console.log("Starting the game agent…");
  await runGameAgent();
})();
