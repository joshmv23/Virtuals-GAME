import prompts from 'prompts';
import type { LITChain, LITEVMChain } from '@lit-protocol/types';

import {
  LawCliError,
  RemoveRpcErrors,
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
    message: 'Select a chain to remove (start typing to filter):',
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
      RemoveRpcErrors.REMOVE_RPC_CANCELLED,
      'No chain selected. Operation cancelled.'
    );
  }

  return chainKey;
};

const promptConfirmRemoval = async (chainName: string): Promise<boolean> => {
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Are you sure you want to remove chain "${chainName}"?`,
    initial: false,
  });

  if (!confirmed) {
    throw new LawCliError(
      RemoveRpcErrors.REMOVE_RPC_CANCELLED,
      'Chain removal cancelled.'
    );
  }

  return confirmed;
};

export const handleRemoveRpc = async (
  localStorage: LocalStorage
): Promise<void> => {
  try {
    const existingRpcsString = localStorage.getItem(StorageKeys.RPCS);
    const existingRpcs = existingRpcsString
      ? JSON.parse(existingRpcsString)
      : {};

    if (Object.keys(existingRpcs).length === 0) {
      throw new LawCliError(
        RemoveRpcErrors.NO_RPCS_FOUND,
        'No RPCs found to remove.'
      );
    }

    // Select chain to remove
    const chainKey = await promptSelectChain(existingRpcs);
    const selectedChain = existingRpcs[chainKey];
    const chainName = (selectedChain as unknown as { name: string }).name;

    // Confirm removal
    await promptConfirmRemoval(chainName);

    // Remove the chain
    delete existingRpcs[chainKey];

    // Save updated chains
    localStorage.setItem(StorageKeys.RPCS, JSON.stringify(existingRpcs));

    logger.success(`Removed chain: ${chainName}`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === RemoveRpcErrors.REMOVE_RPC_CANCELLED) {
        logger.error(error.message);
        return;
      }
      if (error.type === RemoveRpcErrors.NO_RPCS_FOUND) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
