import { GameAgent } from "@virtuals-protocol/game";
import { createOnChainWorker } from "./onChainWorker";
import { LitDelegateeSigner } from "./litDelegateeSigner";

/**
 * Runs the GameAgent (the “AI”), which can call the 
 * `transfer_erc20` function, etc.
 */
export async function runGameAgent() {
  // 1) Grab the delegatee private key from .env
  const DELEGATEE_KEY = process.env.DELEGATEE_PRIVATE_KEY;
  if (!DELEGATEE_KEY) {
    throw new Error("Missing DELEGATEE_PRIVATE_KEY in .env");
  }

  // 2) Init the bridging logic
  const litDelegateeSigner = new LitDelegateeSigner(DELEGATEE_KEY);
  await litDelegateeSigner.init(); // e.g. sets up AwSigner internally

  // 3) Create the onChainWorker that can do the ERC20 transfer
  const onChainWorker = createOnChainWorker(litDelegateeSigner);

  // 4) Build a GAME Agent
  const agent = new GameAgent("YOUR_OPENAI_API_KEY_HERE", {
    name: "Lit-Powered Onchain Agent",
    goal: "Demonstrate bridging to Lit's Agent Wallet for secure tx",
    description: "Calls an ERC20 transfer tool as a Delegatee under PKP constraints.",
    workers: [onChainWorker],
    // Optionally, define a dynamic state the agent can see:
    getAgentState: async () => ({
      balance: "0", // Or read from an RPC
      randomFact: "This is a test agent",
    }),
  });

  // 5) Add a logger for debug
  agent.setLogger(agent, (msg) => {
    console.log(`[${agent.name} LOG]`, msg);
  });

  // 6) Initialize & run. 
  //    *In a real environment, agent.run() might loop and plan tasks autonomously.
  //    *Here we’ll do a single step to show usage.
  await agent.init();

  // If you want an infinite loop every 60s:
  // await agent.run(60, { verbose: true });

  // Or do a single step:
  console.log("Performing single agent step…");
  await agent.step();
}
