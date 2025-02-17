import prompts from 'prompts';

import { GeneralErrors, LawCliError, logger } from '../../../core';

export enum AdminSettingsMenuChoice {
  ConfigureSigner = 'configureSigner',
  Back = 'back',
}

const promptAdminSettingsMenu = async (): Promise<AdminSettingsMenuChoice> => {
  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Configure Signer',
        value: AdminSettingsMenuChoice.ConfigureSigner,
      },
      { title: 'Back', value: AdminSettingsMenuChoice.Back },
    ],
  });

  if (!action) {
    throw new LawCliError(
      GeneralErrors.NO_ACTION_SELECTED,
      'No admin menu action selected. Please select an action to continue.'
    );
  }

  return action as AdminSettingsMenuChoice;
};

export const handleAdminSettingsMenu =
  async (): Promise<AdminSettingsMenuChoice> => {
    try {
      return promptAdminSettingsMenu();
    } catch (error) {
      if (error instanceof LawCliError) {
        if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
          logger.error(error.message);
          return await handleAdminSettingsMenu();
        }
      }
      throw error;
    }
  };
