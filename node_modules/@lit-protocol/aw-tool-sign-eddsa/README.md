# AW-Tool Sign EdDSA Documentation

The `aw-tool-sign-eddsa` package provides functionality for performing EdDSA signing operations using Lit Protocol's PKPs (Programmable Key Pairs). This tool enables secure signing of arbitrary messages while enforcing policy-based controls.

---

## Files Overview (in src/lib)

### 1. **`lit-actions/tool.ts`**
Contains the main logic for executing a Lit Action to perform EdDSA signing operations.

#### Key Features:
- **PKP Info Retrieval**: Fetches PKP details and validates the tool policy
- **Policy Validation**: Checks if a policy exists and executes it if present
- **Message Signing**: Signs messages using EdDSA (Ed25519) via Lit Actions
- **Error Handling**: Comprehensive error handling with detailed responses

---

### 2. **`lit-actions/policy.ts`**
Defines and validates the EdDSA signing policy.

#### Key Features:
- **Policy Validation**: Validates policy parameters including:
  - Allowed message prefixes
  - Message size limits
- **Message Validation**: Ensures messages match allowed patterns
- **Type Safety**: Uses strong typing for policy parameters

---

### 3. **`lit-actions/utils/`**
Collection of utility functions for the signing process:

#### Key Components:
- **`solana-keypair.ts`**: Handles Solana keypair creation and management
- **`sign-message.ts`**: Core message signing functionality
- **`index.ts`**: Exports utility functions

---

## Usage

The tool requires the following parameters:
```typescript
{
  pkpEthAddress: string;    // PKP's Ethereum address
  message: string;         // Message to be signed
  ciphertext: string;      // Encrypted private key data
  dataToEncryptHash: string; // Hash of the encrypted data
}
```

### Policy Parameters

The tool supports policy restrictions on:
- Allowed message prefixes
- Message content validation
- Signing frequency limits

### Response Format

Success Response:
```typescript
{
  status: 'success',
  signature: string,     // Base64-encoded signature
  publicKey: string     // Base58-encoded public key
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

1. **Policy Enforcement**: Validates all signing operations against defined policies
2. **Access Control**: Uses Lit Protocol's access control conditions
3. **Secure Key Management**: Handles private keys securely through encryption
4. **Message Validation**: Enforces message format and content restrictions

---

## Dependencies

- `@solana/web3.js`: Solana blockchain interaction
- `@lit-protocol/aw-tool`: Core Agent Wallet tooling
- `tweetnacl`: For Ed25519 signature verification
