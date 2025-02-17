import prompts from 'prompts';
import type { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, AddDelegateeErrors } from '../../../core';

const promptDelegateeAddress = async (): Promise<string> => {
  const { address } = await prompts({
    type: 'text',
    name: 'address',
    message: 'Enter the delegatee address:',
    validate: (value) => {
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(value);
      return isValidAddress || 'Please enter a valid Ethereum address';
    },
  });

  if (!address) {
    throw new LawCliError(
      AddDelegateeErrors.ADD_DELEGATEE_CANCELLED,
      'Delegatee addition cancelled.'
    );
  }

  return address;
};

export const handleAddDelegatee = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const address = await promptDelegateeAddress();

    await admin.awAdmin.addDelegatee(pkp.info.tokenId, address);
    logger.success(`Successfully added delegatee ${address}.`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === AddDelegateeErrors.ADD_DELEGATEE_CANCELLED) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
