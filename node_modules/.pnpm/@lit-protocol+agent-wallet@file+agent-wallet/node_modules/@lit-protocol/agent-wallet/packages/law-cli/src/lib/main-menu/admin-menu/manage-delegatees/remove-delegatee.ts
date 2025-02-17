import prompts from 'prompts';
import type { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, RemoveDelegateeErrors } from '../../../core';

const promptSelectDelegateeToRemove = async (
  delegatees: string[]
): Promise<string> => {
  if (delegatees.length === 0) {
    throw new LawCliError(
      RemoveDelegateeErrors.NO_DELEGATEES_FOUND,
      'No delegatees found to remove.'
    );
  }

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to remove:',
    choices: delegatees.map((address) => ({
      title: address,
      value: address,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      RemoveDelegateeErrors.REMOVE_DELEGATEE_CANCELLED,
      'Delegatee removal cancelled.'
    );
  }

  return delegatee;
};

export const handleRemoveDelegatee = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const delegatees = await admin.awAdmin.getDelegatees(pkp.info.tokenId);
    const selectedDelegatee = await promptSelectDelegateeToRemove(delegatees);

    await admin.awAdmin.removeDelegatee(pkp.info.tokenId, selectedDelegatee);
    logger.success(`Successfully removed delegatee: ${selectedDelegatee}`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === RemoveDelegateeErrors.REMOVE_DELEGATEE_CANCELLED ||
        error.type === RemoveDelegateeErrors.NO_DELEGATEES_FOUND
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
