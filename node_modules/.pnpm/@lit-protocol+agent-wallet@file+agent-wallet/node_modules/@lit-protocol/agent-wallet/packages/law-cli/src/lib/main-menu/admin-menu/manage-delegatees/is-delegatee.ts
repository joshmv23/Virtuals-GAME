import prompts from 'prompts';
import type { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, IsDelegateeErrors } from '../../../core';

const promptDelegateeAddress = async (): Promise<string> => {
  const { address } = await prompts({
    type: 'text',
    name: 'address',
    message: 'Enter the delegatee address to check:',
    validate: (value) => {
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(value);
      return isValidAddress || 'Please enter a valid Ethereum address';
    },
  });

  if (!address) {
    throw new LawCliError(
      IsDelegateeErrors.IS_DELEGATEE_CANCELLED,
      'Delegatee check cancelled.'
    );
  }

  return address;
};

export const handleIsDelegatee = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const address = await promptDelegateeAddress();

    const isDelegatee = await admin.awAdmin.isDelegatee(
      pkp.info.tokenId,
      address
    );

    if (isDelegatee) {
      logger.success(`${address} is a delegatee.`);
    } else {
      logger.error(`${address} is not a delegatee.`);
    }
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === IsDelegateeErrors.IS_DELEGATEE_CANCELLED) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
