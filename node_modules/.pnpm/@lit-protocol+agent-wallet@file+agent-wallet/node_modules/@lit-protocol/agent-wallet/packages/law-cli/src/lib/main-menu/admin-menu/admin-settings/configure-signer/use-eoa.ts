import prompts from 'prompts';
import { ethers } from 'ethers';

import {
  LocalStorage,
  StorageKeys,
  LawCliError,
  AdminErrors,
  logger,
  getLitNetwork,
} from '../../../../core';
import { AdminSignerType } from './menu';
import { Admin } from '../../admin';

type AdminStorageLayout = {
  [ethAddress: string]: {
    privateKey: string;
  };
};

const promptSelectAdmin = async (
  localStorage: LocalStorage
): Promise<{ address: string; privateKey: string } | null> => {
  const admins = getStoredAdmins(localStorage);
  const addresses = Object.keys(admins);

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
    message: 'Select an admin wallet or add a new one:',
    choices,
  });

  if (!selection) {
    throw new LawCliError(
      AdminErrors.ADMIN_SELECTION_CANCELLED,
      'Admin selection cancelled.'
    );
  }

  if (selection === 'new') {
    return null;
  }

  return {
    address: selection,
    privateKey: admins[selection].privateKey,
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
      AdminErrors.ADMIN_MISSING_PRIVATE_KEY,
      'No private key provided. Operation cancelled.'
    );
  }

  return privateKey;
};

const getStoredAdmins = (localStorage: LocalStorage): AdminStorageLayout => {
  const storedData = localStorage.getItem(StorageKeys.ADMIN_STORAGE);
  return storedData ? JSON.parse(storedData) : {};
};

const saveAdmin = (
  localStorage: LocalStorage,
  address: string,
  privateKey: string
) => {
  const admins = getStoredAdmins(localStorage);
  admins[address] = {
    privateKey,
  };
  localStorage.setItem(StorageKeys.ADMIN_STORAGE, JSON.stringify(admins));
};

export const handleUseEoaForAdmin = async (
  localStorage: LocalStorage
): Promise<Admin> => {
  try {
    // First check if we have any stored admins
    const existingAdmin = await promptSelectAdmin(localStorage);
    let privateKey: string;
    let address: string;

    if (existingAdmin) {
      privateKey = existingAdmin.privateKey;
      address = existingAdmin.address;
    } else {
      privateKey = await promptPrivateKey();
      // Create wallet to get address
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
      // Save new admin
      saveAdmin(localStorage, address, privateKey);
    }

    // Set the current active admin
    localStorage.setItem(StorageKeys.ADMIN_ACTIVE_ADDRESS, address);
    localStorage.setItem(StorageKeys.ADMIN_SIGNER_TYPE, AdminSignerType.Eoa);

    const litNetwork = await getLitNetwork(localStorage);
    const awAdmin = await Admin.create(litNetwork, privateKey);

    logger.success(
      `EOA signer configured successfully with address: ${address}`
    );

    return awAdmin;
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === AdminErrors.ADMIN_MISSING_PRIVATE_KEY ||
        error.type === AdminErrors.FAILED_TO_INITIALIZE_ADMIN ||
        error.type === AdminErrors.ADMIN_SELECTION_CANCELLED
      ) {
        logger.error(error.message);
        return await handleUseEoaForAdmin(localStorage);
      }
    }
    throw error;
  }
};
