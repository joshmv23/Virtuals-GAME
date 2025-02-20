# AW-Tool Jupiter Swap Documentation

The `aw-tool-jupiter-swap` package contains utilities for performing token swaps on Solana using Jupiter Exchange via Lit Protocol.

---

## Files Overview (in src/lib)

### 1. **`lit-actions/tool.ts`**
Contains the main logic for executing a Lit Action to perform a Jupiter swap.

#### Key Features:
- **PKP Info Retrieval**: Fetches PKP details and validates the tool policy.
- **Policy Validation**: Checks if a policy exists and executes it if present.
- **Swap Execution**: Handles the complete swap flow including:
  - Getting token decimals
  - Converting amounts to atomic units
  - Fetching Jupiter quotes
  - Creating and signing transactions
  - Broadcasting the swap transaction

---

### 2. **`lit-actions/policy.ts`**
Defines and validates the Jupiter swap policy.

#### Key Features:
- **Policy Validation**: Validates policy parameters including:
  - Maximum swap amount
  - Allowed token addresses
- **Token Address Validation**: Ensures tokens are valid Solana public keys
- **Amount Validation**: Checks if swap amount is within policy limits

---

### 3. **`lit-actions/utils/`**
Collection of utility functions for the swap process:

#### Key Components:
- **`solana-keypair.ts`**: Handles Solana keypair creation and management
- **`solana-connection.ts`**: Manages Solana RPC connections
- **`token-decimals.ts`**: Retrieves token decimal information
- **`atomic-conversion.ts`**: Converts between human-readable and atomic amounts
- **`quote.ts`**: Interfaces with Jupiter's quote API
- **`swap.ts`**: Handles swap transaction creation
- **`transaction.ts`**: Manages transaction signing and sending

---

## Usage

The tool requires the following parameters:
```typescript
{
  pkpEthAddress: string;    // PKP's Ethereum address
  tokenIn: string;         // Input token's Solana address
  tokenOut: string;        // Output token's Solana address
  amountIn: string;        // Amount to swap (in human-readable format)
  ciphertext: string;      // Encrypted private key data
  dataToEncryptHash: string; // Hash of the encrypted data
}
```

### Policy Parameters

The tool supports policy restrictions on:
- Maximum swap amount
- Allowed token addresses

### Response Format

Success Response:
```typescript
{
  status: 'success',
  message: 'Swap transaction sent successfully',
  txid: string  // Solana transaction ID
}
```

Error Response:
```typescript
{
  status: 'error',
  error: string,
  details: {
    message: string,
    type: string,
    stack?: string
  }
}
```

---

## Security Features

1. **Policy Enforcement**: Validates all swaps against defined policies
2. **Access Control**: Uses Lit Protocol's access control conditions
3. **Secure Key Management**: Handles private keys securely through encryption
4. **Input Validation**: Validates all input parameters before execution

---

## Dependencies

- `@solana/web3.js`: Solana blockchain interaction
- `@lit-protocol/aw-tool`: Core Agent Wallet tooling
- Jupiter Exchange SDK: For swap functionality
