import prompts from 'prompts';
import type { LitNetwork } from '@lit-protocol/agent-wallet';

import {
  ChangeLitNetworkErrors,
  LawCliError,
  LocalStorage,
  logger,
  StorageKeys,
} from '../../core';

const promptChangeLitNetwork = async (): Promise<LitNetwork> => {
  const { network } = await prompts({
    type: 'select',
    name: 'network',
    message: 'Select a Lit network:',
    choices: [
      {
        title: 'Datil Dev',
        description: 'Development network',
        value: 'datil-dev',
      },
      {
        title: 'Datil Test',
        description: 'Pre-production test network',
        value: 'datil-test',
      },
      {
        title: 'Datil',
        description: 'Production network',
        value: 'datil',
      },
    ],
  });

  if (!network) {
    throw new LawCliError(
      ChangeLitNetworkErrors.NO_LIT_NETWORK_SELECTED,
      'No Lit network selected. Please select a network to continue.'
    );
  }

  return network as LitNetwork;
};

export const handleChangeLitNetwork = async (
  localStorage: LocalStorage
): Promise<LitNetwork> => {
  try {
    const selectedLitNetwork = await promptChangeLitNetwork();
    localStorage.setItem(StorageKeys.LIT_NETWORK, selectedLitNetwork);
    return selectedLitNetwork;
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === ChangeLitNetworkErrors.NO_LIT_NETWORK_SELECTED) {
        logger.error(error.message);
        return await handleChangeLitNetwork(localStorage);
      }
    }
    throw error;
  }
};
