import prompts from 'prompts';
import type { LITChain, LITEVMChain } from '@lit-protocol/types';

import {
  LawCliError,
  AddRpcErrors,
  LocalStorage,
  StorageKeys,
  logger,
} from '../../../core';

const promptChainName = async (): Promise<string> => {
  const { chainName } = await prompts({
    type: 'text',
    name: 'chainName',
    message: 'Enter the chain name:',
  });

  if (!chainName) {
    throw new LawCliError(
      AddRpcErrors.ADD_RPC_CANCELLED,
      'Chain name is required. Operation cancelled.'
    );
  }

  return chainName;
};

const promptChainInfo = async () => {
  const chainInfo = await prompts([
    {
      type: 'number',
      name: 'chainId',
      message: 'Enter the chain ID:',
      validate: (value) => value > 0 || 'Chain ID must be greater than 0',
    },
    {
      type: 'text',
      name: 'symbol',
      message: 'Enter the chain symbol:',
      validate: (value) => !!value || 'Symbol is required',
    },
    {
      type: 'number',
      name: 'decimals',
      message: 'Enter the number of decimals:',
      initial: 18,
      validate: (value) => value >= 0 || 'Decimals must be 0 or greater',
    },
    {
      type: 'text',
      name: 'rpcUrl',
      message: 'Enter the RPC URL:',
      validate: (value) => !!value || 'RPC URL is required',
    },
    {
      type: 'text',
      name: 'blockExplorerUrl',
      message: 'Enter the block explorer URL:',
      validate: (value) => !!value || 'Block explorer URL is required',
    },
  ]);

  if (
    !chainInfo.chainId ||
    !chainInfo.symbol ||
    !chainInfo.rpcUrl ||
    !chainInfo.blockExplorerUrl
  ) {
    throw new LawCliError(
      AddRpcErrors.ADD_RPC_CANCELLED,
      'All chain information is required. Operation cancelled.'
    );
  }

  return {
    ...chainInfo,
    vmType: 'EVM' as const,
  };
};

const formatChainKey = (name: string): string =>
  name.toLowerCase().replace(/\s+(.)/g, (_, c) => c.toUpperCase());

export const handleAddRpc = async (
  localStorage: LocalStorage
): Promise<void> => {
  try {
    // Get existing chains
    const existingRpcsString = localStorage.getItem(StorageKeys.RPCS);
    const existingRpcs: LITChain<LITEVMChain> = existingRpcsString
      ? JSON.parse(existingRpcsString)
      : {};

    // Get and validate chain name
    const chainName = await promptChainName();
    const chainKey = formatChainKey(chainName);

    // Check if chain name already exists
    const chainExists = Object.values(existingRpcs).some(
      (chain) => chain.name.toLowerCase() === chainName.toLowerCase()
    );

    if (chainExists) {
      throw new LawCliError(
        AddRpcErrors.CHAIN_NAME_EXISTS,
        `Chain with name "${chainName}" already exists.`
      );
    }

    // Get chain info
    const chainInfo = await promptChainInfo();

    // Add new chain to existing chains
    const newChain = {
      name: chainName,
      chainId: chainInfo.chainId,
      symbol: chainInfo.symbol,
      decimals: chainInfo.decimals,
      rpcUrls: [chainInfo.rpcUrl],
      blockExplorerUrls: [chainInfo.blockExplorerUrl],
      vmType: 'EVM' as const,
    };

    existingRpcs[chainKey] = newChain as LITEVMChain;

    // Save updated chains
    localStorage.setItem(StorageKeys.RPCS, JSON.stringify(existingRpcs));

    logger.success(`Added new chain: ${chainName}`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === AddRpcErrors.CHAIN_NAME_EXISTS) {
        logger.error(error.message);
        return;
      }
      if (error.type === AddRpcErrors.ADD_RPC_CANCELLED) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
