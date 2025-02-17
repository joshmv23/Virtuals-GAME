import prompts from 'prompts';
import {
  LawCliError,
  DelegateeErrors,
  LocalStorage,
  StorageKeys,
} from '../../core';

export interface ChainInfo {
  name: string;
  chainId: number;
  rpcUrls: string[];
}

/**
 * Gets the list of configured chains from local storage.
 */
const getConfiguredChains = (
  localStorage: LocalStorage
): Record<string, ChainInfo> => {
  const chainsData = localStorage.getItem(StorageKeys.RPCS);
  if (!chainsData) {
    throw new LawCliError(
      DelegateeErrors.NO_CHAINS_CONFIGURED,
      'No chains are configured in local storage'
    );
  }
  return JSON.parse(chainsData);
};

/**
 * Prompts for manual chain details.
 */
const promptManualChainDetails = async (
  needsChainId: boolean,
  needsRpcUrl: boolean
): Promise<{ chainId?: string; rpcUrl?: string }> => {
  const params: { chainId?: string; rpcUrl?: string } = {};

  if (needsChainId) {
    const { chainId } = await prompts({
      type: 'text',
      name: 'chainId',
      message: 'Enter the chain ID:',
      validate: (value) => !isNaN(Number(value)) || 'Chain ID must be a number',
    });

    if (!chainId) {
      throw new LawCliError(
        DelegateeErrors.CHAIN_SELECTION_CANCELLED,
        'Chain ID input was cancelled'
      );
    }

    params.chainId = chainId;
  }

  if (needsRpcUrl) {
    const { rpcUrl } = await prompts({
      type: 'text',
      name: 'rpcUrl',
      message: 'Enter the RPC URL:',
      validate: (value) =>
        value.startsWith('http') || 'RPC URL must start with http',
    });

    if (!rpcUrl) {
      throw new LawCliError(
        DelegateeErrors.CHAIN_SELECTION_CANCELLED,
        'RPC URL input was cancelled'
      );
    }

    params.rpcUrl = rpcUrl;
  }

  return params;
};

/**
 * Prompts the user to select a chain from the configured chains or enter custom values.
 */
export const promptSelectChain = async (
  localStorage: LocalStorage,
  params: { needsChainId?: boolean; needsRpcUrl?: boolean }
): Promise<{ chainId?: string; rpcUrl?: string }> => {
  const chainChoices = Object.entries(getConfiguredChains(localStorage))
    .map(([chainKey, chain]) => ({
      title: (chain.name || '').trim().replace(/\s+/g, ' '),
      description: `Chain ID: ${chain.chainId}, RPC URL: ${chain.rpcUrls[0]}`,
      value: {
        chainId: chain.chainId.toString(),
        rpcUrl: chain.rpcUrls[0],
      },
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const { selection } = await prompts({
    type: 'autocomplete',
    name: 'selection',
    message:
      'Select a chain or enter details manually (start typing to filter):',
    choices: [
      {
        title: 'Manually enter chain details',
        value: 'manual',
      },
      ...chainChoices,
    ],
    suggest: async (input: string, choices) => {
      const inputLower = input.toLowerCase();
      return choices.filter((choice) =>
        choice.title.toLowerCase().includes(inputLower)
      );
    },
  });

  if (!selection) {
    throw new LawCliError(
      DelegateeErrors.CHAIN_SELECTION_CANCELLED,
      'Chain selection was cancelled'
    );
  }

  if (selection === 'manual') {
    return promptManualChainDetails(
      !!params.needsChainId,
      !!params.needsRpcUrl
    );
  }

  // If only one parameter is needed, only return that one
  const result: { chainId?: string; rpcUrl?: string } = {};
  if (params.needsChainId) result.chainId = selection.chainId;
  if (params.needsRpcUrl) result.rpcUrl = selection.rpcUrl;
  return result;
};
