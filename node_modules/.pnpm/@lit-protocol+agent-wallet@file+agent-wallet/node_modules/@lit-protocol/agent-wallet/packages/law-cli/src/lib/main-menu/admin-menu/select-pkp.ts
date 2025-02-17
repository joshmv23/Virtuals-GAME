import prompts from 'prompts';
import { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from './admin';
import { LawCliError, AdminErrors, logger } from '../../core';

export enum SelectPkpMenuChoice {
  MintNew = 'mintNew',
  Back = 'back',
}

const promptSelectOrMintPkp = async (
  admin: Admin
): Promise<SelectPkpMenuChoice | PkpInfo> => {
  const pkps = await admin.awAdmin.getPkps();

  const choices = [
    {
      title: 'Mint New Agent Wallet',
      value: SelectPkpMenuChoice.MintNew,
    },
    ...pkps.map((pkp, i) => ({
      title: pkp.info.ethAddress,
      description: `Token ID: ${pkp.info.tokenId}`,
      value: pkp,
    })),
    {
      title: 'Back',
      value: SelectPkpMenuChoice.Back,
    },
  ];

  const { selection } = await prompts({
    type: 'select',
    name: 'selection',
    message: 'Select an Agent Wallet to manage or mint a new one:',
    choices,
  });

  if (!selection) {
    throw new LawCliError(
      AdminErrors.PKP_SELECTION_CANCELLED,
      'Agent Wallet selection cancelled.'
    );
  }

  return selection;
};

export const handleSelectPkpForAdmin = async (
  admin: Admin
): Promise<PkpInfo | null> => {
  try {
    const selection = await promptSelectOrMintPkp(admin);

    if (selection === SelectPkpMenuChoice.MintNew) {
      const pkp = await admin.awAdmin.mintPkp();
      logger.info(`Minted new Agent Wallet: ${pkp.info.ethAddress}`);
      return pkp;
    }

    if (selection === SelectPkpMenuChoice.Back) {
      return null;
    }

    return selection;
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === AdminErrors.PKP_SELECTION_CANCELLED) {
        logger.error(error.message);
        return null;
      }
    }
    throw error;
  }
};
