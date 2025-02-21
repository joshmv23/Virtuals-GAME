# Virtuals GAME Framework with Lit Protocol Integration

## Prerequisites

- Node.js (v16 or higher)
- Git
- pnpm (for workspace management)

## Repository Structure

```
Virtuals-GAME/
├── game-node/         # GAME framework implementation
├── agent-wallet/      # Lit Protocol Agent Wallet implementation
└── packages/          # Shared packages and integrations
```

## Initial Setup

1. Clone the repository with submodules:
```bash
git clone --recursive git@github.com:yourusername/Virtuals-GAME.git
cd Virtuals-GAME
```

2. Install dependencies:
```bash
# Install root dependencies
pnpm install

# Install game-node dependencies
cd game-node
npm install --save-dev typescript ts-node @types/node

# Install hardhat dependencies
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai @types/chai
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
# Lit Protocol Configuration
PKP_PUBLIC_KEY=your_pkp_public_key
VIRTUALS_API_KEY=your_virtuals_api_key

# Network Configuration
RPC_URL=https://yellowstone-rpc.litprotocol.com
CHAIN_ID=175177

# Contract Addresses
POLICY_ADDRESS=your_policy_contract_address
LIT_AGENT_WALLET_ADDRESS=your_agent_wallet_address

# Test Accounts
PRIVATE_KEY=your_private_key_for_testing
PRIVATE_KEY_2=second_private_key_for_testing
```

## Lit Protocol Components

This implementation uses several key Lit Protocol components:

1. **PKP (Programmable Key Pairs)**
   - Used for secure transaction signing
   - Managed through the Lit Agent Wallet

2. **Lit Actions**
   - Smart contract interactions
   - Policy enforcement
   - Transaction execution

3. **Lit Node Client**
   - Network communication
   - Authentication
   - Session management

## Running Tests

1. Start by compiling the contracts:
```bash
cd game-node
npx hardhat compile
```

2. Run the test suite:
```bash
npx hardhat test
```

3. For specific test files:
```bash
npx hardhat test test/specific-test-file.ts
```

## Development Workflow

1. **Build and Compile**
   ```bash
   # Build TypeScript files
   npm run build
   
   # Compile contracts
   npm run compile
   ```

2. **Run the Application**
   ```bash
   npm start
   ```

## Testing

> ⚠️ Note: Test suite is currently under development. Basic contract compilation and TypeScript building are available.

To prepare for development:

1. Compile contracts:
```bash
npx hardhat compile
```

2. Build TypeScript files:
```bash
npm run build
```

## Deployment

1. **Deploy Contracts**
   ```bash
   # Deploy to Chronicle testnet
   npx hardhat run scripts/deploy.ts --network chronicle
   ```

2. **After deployment:**
   - Update your `.env` file with the deployed contract addresses
   - Verify contracts on the blockchain explorer
   ```bash
   npx hardhat verify --network chronicle DEPLOYED_CONTRACT_ADDRESS
   ```

## Common Issues and Solutions

1. **Submodule Updates**
   If you need to update submodules:
   ```bash
   git submodule update --init --recursive
   ```

2. **Lit Authentication**
   If experiencing authentication issues:
   - Verify PKP public key is correct
   - Ensure RPC endpoint is accessible
   - Check network configuration

3. **Contract Verification**
   After deployment:
   ```bash
   npx hardhat verify --network chronicle DEPLOYED_CONTRACT_ADDRESS
   ```

## Architecture Overview

### GAME Framework
- High-level planner (Agent)
- Low-level planner (Worker)
- Executable functions

### Lit Integration
- Agent Wallet for secure key management
- Policy enforcement through smart contracts
- Automated trading capabilities

## Contributing

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push changes:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team
- Check documentation in `/docs`