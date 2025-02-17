import prompts from 'prompts';
import { DelegatedPkpInfo } from '@lit-protocol/agent-wallet';

import { Delegatee } from './delegatee';
import { LawCliError, DelegateeErrors, logger } from '../../core';

const promptSelectDelegatedPkp = async (
  delegatee: Delegatee
): Promise<DelegatedPkpInfo | null> => {
  const pkps = await delegatee.awDelegatee.getDelegatedPkps();

  if (pkps.length === 0) {
    throw new LawCliError(
      DelegateeErrors.NO_DELEGATED_PKPS,
      'No delegated Agent Wallets found.'
    );
  }

  const choices = [
    ...pkps.map((pkp: DelegatedPkpInfo, i: number) => ({
      title: pkp.ethAddress,
      description: `Token ID: ${pkp.tokenId}`,
      value: pkp,
    })),
    {
      title: 'Back',
      value: null,
    },
  ];

  const { selection } = await prompts({
    type: 'select',
    name: 'selection',
    message: 'Select a delegated Agent Wallet to use:',
    choices,
  });

  if (!selection) {
    throw new LawCliError(
      DelegateeErrors.DELEGATEE_SELECTION_CANCELLED,
      'Agent Wallet selection cancelled.'
    );
  }

  return selection;
};

export const handleSelectPkpForDelegatee = async (
  delegatee: Delegatee
): Promise<DelegatedPkpInfo | null> => {
  try {
    const selection = await promptSelectDelegatedPkp(delegatee);
    return selection;
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === DelegateeErrors.DELEGATEE_SELECTION_CANCELLED ||
        error.type === DelegateeErrors.NO_DELEGATED_PKPS
      ) {
        logger.error(error.message);
        return null;
      }
    }
    throw error;
  }
};
