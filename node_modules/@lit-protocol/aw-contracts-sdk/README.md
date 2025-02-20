# aw-contracts-sdk

This package contains the contracts and some utility functions for interacting with the `PkpToolRegistry` contracts.

The Ethers.js human-readable ABI is located in [`src/lib/human-readable-abi.ts`](src/lib/human-readable-abi.ts), and can be imported from this package as `PKP_TOOL_REGISTRY_ABI`.

You can also import `getPkpToolRegistryContract` function and call it to get an ether.js contract instance of `PkpToolRegistry`.

`DEFAULT_REGISTRY_CONFIG` is also exported and contains the `PkpToolRegistry` contract addresses for the different Lit networks.
