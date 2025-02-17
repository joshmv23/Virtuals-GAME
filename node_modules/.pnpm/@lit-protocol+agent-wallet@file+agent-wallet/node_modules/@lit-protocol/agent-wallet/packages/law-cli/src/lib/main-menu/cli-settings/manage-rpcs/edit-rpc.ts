import prompts from 'prompts';
import type { LITChain, LITEVMChain } from '@lit-protocol/types';

import {
  LawCliError,
  EditRpcErrors,
  LocalStorage,
  StorageKeys,
  logger,
} from '../../../core';

const promptSelectChain = async (
  existingRpcs: Record<string, LITChain<LITEVMChain>>
): Promise<string> => {
  const { chainKey } = await prompts({
    type: 'autocomplete',
    name: 'chainKey',
    message: 'Select a chain to edit (start typing to filter):',
    choices: Object.entries(existingRpcs)
      .map(([key, chain]) => ({
        title: ((chain as unknown as { name: string }).name || '')
          .trim()
          .replace(/\s+/g, ' '),
        value: key,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    suggest: async (input: string, choices) => {
      const inputLower = input.toLowerCase();
      return choices.filter((choice) =>
        choice.title.toLowerCase().includes(inputLower)
      );
    },
  });

  if (!chainKey) {
    throw new LawCliError(
      EditRpcErrors.EDIT_RPC_CANCELLED,
      'No chain selected. Operation cancelled.'
    );
  }

  return chainKey;
};

const promptEditChainInfo = async (chain: LITChain<LITEVMChain>) => {
  const typedChain = chain as unknown as {
    name: string;
    chainId: number;
    symbol: string;
    decimals: number;
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };

  const chainInfo = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Enter the chain name:',
      initial: typedChain.name,
      validate: (value) => !!value || 'Name is required',
    },
    {
      type: 'text',
      name: 'chainId',
      message: 'Enter the chain ID:',
      initial: String(typedChain.chainId),
      validate: (value) => {
        const intValue = Math.floor(Number(value));
        if (Number.isNaN(intValue)) return 'Chain ID must be a number';
        return intValue > 0 ? true : 'Chain ID must be greater than 0';
      },
    },
    {
      type: 'text',
      name: 'symbol',
      message: 'Enter the chain symbol:',
      initial: typedChain.symbol,
      validate: (value) => !!value || 'Symbol is required',
    },
    {
      type: 'number',
      name: 'decimals',
      message: 'Enter the number of decimals:',
      initial: typedChain.decimals,
      validate: (value) => value >= 0 || 'Decimals must be 0 or greater',
    },
    {
      type: 'text',
      name: 'rpcUrl',
      message: 'Enter the RPC URL:',
      initial: typedChain.rpcUrls[0] || '',
      validate: (value) => !!value || 'RPC URL is required',
    },
    {
      type: 'text',
      name: 'blockExplorerUrl',
      message: 'Enter the block explorer URL:',
      initial: typedChain.blockExplorerUrls[0] || '',
      validate: (value) => !!value || 'Block explorer URL is required',
    },
  ]);

  if (
    !chainInfo.name ||
    !chainInfo.chainId ||
    !chainInfo.symbol ||
    !chainInfo.rpcUrl ||
    !chainInfo.blockExplorerUrl
  ) {
    throw new LawCliError(
      EditRpcErrors.EDIT_RPC_CANCELLED,
      'All chain information is required. Operation cancelled.'
    );
  }

  return {
    ...chainInfo,
    rpcUrls: [chainInfo.rpcUrl],
    blockExplorerUrls: [chainInfo.blockExplorerUrl],
    vmType: 'EVM' as const,
  };
};

export const handleEditRpc = async (
  localStorage: LocalStorage
): Promise<void> => {
  try {
    const existingRpcsString = localStorage.getItem(StorageKeys.RPCS);
    const existingRpcs = existingRpcsString
      ? JSON.parse(existingRpcsString)
      : {};

    if (Object.keys(existingRpcs).length === 0) {
      throw new LawCliError(
        EditRpcErrors.NO_RPCS_FOUND,
        'No RPCs found to edit.'
      );
    }

    // Select chain to edit
    const chainKey = await promptSelectChain(existingRpcs);
    const selectedChain = existingRpcs[chainKey];

    // Edit chain info
    const updatedChain = await promptEditChainInfo(selectedChain);
    existingRpcs[chainKey] = updatedChain;

    // Save updated chains
    localStorage.setItem(StorageKeys.RPCS, JSON.stringify(existingRpcs));

    logger.success(`Updated chain: ${updatedChain.name}`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === EditRpcErrors.EDIT_RPC_CANCELLED) {
        logger.error(error.message);
        return;
      }
      if (error.type === EditRpcErrors.NO_RPCS_FOUND) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
