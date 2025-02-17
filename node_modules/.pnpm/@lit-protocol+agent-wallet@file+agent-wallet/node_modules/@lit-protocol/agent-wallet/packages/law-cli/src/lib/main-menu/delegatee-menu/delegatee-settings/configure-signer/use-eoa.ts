import prompts from 'prompts';
import { ethers } from 'ethers';

import {
  LocalStorage,
  StorageKeys,
  LawCliError,
  logger,
  getLitNetwork,
  DelegateeErrors,
} from '../../../../core';
import { DelegateeSignerType } from './menu';
import { Delegatee } from '../../delegatee';

type DelegateeStorageLayout = {
  [ethAddress: string]: {
    privateKey: string;
  };
};

const promptSelectDelegatee = async (
  localStorage: LocalStorage
): Promise<{ address: string; privateKey: string } | null> => {
  const delegatees = getStoredDelegatees(localStorage);
  const addresses = Object.keys(delegatees);

  if (addresses.length === 0) {
    return null;
  }

  const choices = [
    {
      title: 'Use new private key',
      value: 'new',
    },
    ...addresses.map((addr) => ({
      title: addr,
      value: addr,
    })),
  ];

  const { selection } = await prompts({
    type: 'select',
    name: 'selection',
    message: 'Select a delegatee wallet or add a new one:',
    choices,
  });

  if (!selection) {
    throw new LawCliError(
      DelegateeErrors.DELEGATEE_SELECTION_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  if (selection === 'new') {
    return null;
  }

  return {
    address: selection,
    privateKey: delegatees[selection].privateKey,
  };
};

const promptPrivateKey = async (): Promise<string> => {
  const { privateKey } = await prompts({
    type: 'password',
    name: 'privateKey',
    message: 'Enter your private key:',
    validate: (value) => {
      // Basic validation for private key format (0x followed by 64 hex characters)
      const isValidFormat = /^0x[0-9a-fA-F]{64}$/.test(value);
      return isValidFormat
        ? true
        : 'Please enter a valid private key (0x followed by 64 hex characters)';
    },
  });

  if (!privateKey) {
    throw new LawCliError(
      DelegateeErrors.DELEGATEE_MISSING_PRIVATE_KEY,
      'No private key provided. Operation cancelled.'
    );
  }

  return privateKey;
};

const getStoredDelegatees = (
  localStorage: LocalStorage
): DelegateeStorageLayout => {
  const storedData = localStorage.getItem(StorageKeys.DELEGATEE_STORAGE);
  return storedData ? JSON.parse(storedData) : {};
};

const saveDelegatee = (
  localStorage: LocalStorage,
  address: string,
  privateKey: string
) => {
  const delegatees = getStoredDelegatees(localStorage);
  delegatees[address] = {
    privateKey,
  };
  localStorage.setItem(
    StorageKeys.DELEGATEE_STORAGE,
    JSON.stringify(delegatees)
  );
};

export const handleUseEoaForDelegatee = async (
  localStorage: LocalStorage
): Promise<Delegatee> => {
  try {
    // First check if we have any stored delegatees
    const existingDelegatee = await promptSelectDelegatee(localStorage);
    let privateKey: string;
    let address: string;

    if (existingDelegatee) {
      privateKey = existingDelegatee.privateKey;
      address = existingDelegatee.address;
    } else {
      privateKey = await promptPrivateKey();
      // Create wallet to get address
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
      // Save new delegatee
      saveDelegatee(localStorage, address, privateKey);
    }

    // Set the current active delegatee
    localStorage.setItem(StorageKeys.DELEGATEE_ACTIVE_ADDRESS, address);
    localStorage.setItem(
      StorageKeys.DELEGATEE_SIGNER_TYPE,
      DelegateeSignerType.Eoa
    );

    const litNetwork = await getLitNetwork(localStorage);
    const awDelegatee = await Delegatee.create(litNetwork, privateKey);

    logger.success(
      `EOA signer configured successfully with address: ${address}`
    );

    return awDelegatee;
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === DelegateeErrors.DELEGATEE_MISSING_PRIVATE_KEY ||
        error.type === DelegateeErrors.FAILED_TO_INITIALIZE_DELEGATEE ||
        error.type === DelegateeErrors.DELEGATEE_SELECTION_CANCELLED
      ) {
        logger.error(error.message);
        return await handleUseEoaForDelegatee(localStorage);
      }
    }
    throw error;
  }
};
