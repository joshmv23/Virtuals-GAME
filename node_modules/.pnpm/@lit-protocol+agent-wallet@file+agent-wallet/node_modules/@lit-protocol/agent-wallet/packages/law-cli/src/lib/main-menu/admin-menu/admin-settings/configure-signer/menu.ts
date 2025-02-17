import prompts from 'prompts';

import { LawCliError, GeneralErrors, logger } from '../../../../core';

export enum AdminConfigureSignerMenuChoice {
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

const promptConfigureSignerMenu =
  async (): Promise<AdminConfigureSignerMenuChoice> => {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          title: 'Use EOA',
          value: AdminConfigureSignerMenuChoice.UseEoa,
        },
        {
          title: 'Use MultiSig',
          value: AdminConfigureSignerMenuChoice.UseMultiSig,
          disabled: true,
        },
        {
          title: 'Use Pkp',
          value: AdminConfigureSignerMenuChoice.UsePkp,
          disabled: true,
        },
        { title: 'Back', value: AdminConfigureSignerMenuChoice.Back },
      ],
    });

    if (!action) {
      throw new LawCliError(
        GeneralErrors.NO_ACTION_SELECTED,
        'No admin menu action selected. Please select an action to continue.'
      );
    }

    return action as AdminConfigureSignerMenuChoice;
  };

export const handleConfigureAdminSignerMenu =
  async (): Promise<AdminConfigureSignerMenuChoice> => {
    try {
      return promptConfigureSignerMenu();
    } catch (error) {
      if (error instanceof LawCliError) {
        if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
          logger.error(error.message);
          return await handleConfigureAdminSignerMenu();
        }
      }
      throw error;
    }
  };
