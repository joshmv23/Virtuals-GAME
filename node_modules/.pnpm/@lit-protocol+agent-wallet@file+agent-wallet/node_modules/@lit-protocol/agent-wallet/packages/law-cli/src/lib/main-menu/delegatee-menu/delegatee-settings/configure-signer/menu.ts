import prompts from 'prompts';

import { LawCliError, GeneralErrors, logger } from '../../../../core';

export enum DelegateeConfigureSignerMenuChoice {
  UseEoa = 'useEoa',
  UseMultiSig = 'useMultiSig',
  UsePkp = 'usePkp',
  Back = 'back',
}

export enum AdminSignerType {
  Eoa = 'eoa',
  MultiSig = 'multiSig',
  Pkp = 'pkp',
}

export enum DelegateeSignerType {
  Eoa = 'eoa',
  Pkp = 'pkp',
}

const promptConfigureSignerMenu =
  async (): Promise<DelegateeConfigureSignerMenuChoice> => {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          title: 'Use EOA',
          value: DelegateeConfigureSignerMenuChoice.UseEoa,
        },
        {
          title: 'Use Pkp',
          value: DelegateeConfigureSignerMenuChoice.UsePkp,
          disabled: true,
        },
        { title: 'Back', value: DelegateeConfigureSignerMenuChoice.Back },
      ],
    });

    if (!action) {
      throw new LawCliError(
        GeneralErrors.NO_ACTION_SELECTED,
        'No admin menu action selected. Please select an action to continue.'
      );
    }

    return action as DelegateeConfigureSignerMenuChoice;
  };

export const handleConfigureDelegateeSignerMenu =
  async (): Promise<DelegateeConfigureSignerMenuChoice> => {
    try {
      return promptConfigureSignerMenu();
    } catch (error) {
      if (error instanceof LawCliError) {
        if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
          logger.error(error.message);
          return await handleConfigureDelegateeSignerMenu();
        }
      }
      throw error;
    }
  };
