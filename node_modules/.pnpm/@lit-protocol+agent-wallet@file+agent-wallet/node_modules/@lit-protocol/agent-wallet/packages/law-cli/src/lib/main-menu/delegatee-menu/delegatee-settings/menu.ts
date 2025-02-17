import prompts from 'prompts';

import { GeneralErrors, LawCliError, logger } from '../../../core';

export enum DelegateeSettingsMenuChoice {
  ConfigureSigner = 'configureSigner',
  Back = 'back',
}

const promptDelegateeSettingsMenu =
  async (): Promise<DelegateeSettingsMenuChoice> => {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          title: 'Configure Signer',
          value: DelegateeSettingsMenuChoice.ConfigureSigner,
        },
        { title: 'Back', value: DelegateeSettingsMenuChoice.Back },
      ],
    });

    if (!action) {
      throw new LawCliError(
        GeneralErrors.NO_ACTION_SELECTED,
        'No admin menu action selected. Please select an action to continue.'
      );
    }

    return action as DelegateeSettingsMenuChoice;
  };

export const handleDelegateeSettingsMenu =
  async (): Promise<DelegateeSettingsMenuChoice> => {
    try {
      return promptDelegateeSettingsMenu();
    } catch (error) {
      if (error instanceof LawCliError) {
        if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
          logger.error(error.message);
          return await handleDelegateeSettingsMenu();
        }
      }
      throw error;
    }
  };
