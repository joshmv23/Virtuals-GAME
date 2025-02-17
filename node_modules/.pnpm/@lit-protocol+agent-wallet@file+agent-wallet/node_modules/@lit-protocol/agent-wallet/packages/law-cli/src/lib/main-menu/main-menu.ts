import prompts from 'prompts';

import { LawCliError, logger, MainMenuErrors } from '../core';

export enum MainMenuChoice {
  AdminMenu = 'adminMenu',
  DelegateeMenu = 'delegateeMenu',
  CliSettings = 'cliSettings',
}

const promptMainMenu = async (): Promise<MainMenuChoice> => {
  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Admin Menu',
        value: MainMenuChoice.AdminMenu,
      },
      { title: 'Delegatee Menu', value: MainMenuChoice.DelegateeMenu },
      { title: 'Change CLI Settings', value: MainMenuChoice.CliSettings },
    ],
  });

  if (!action) {
    throw new LawCliError(
      MainMenuErrors.NO_MAIN_MENU_ACTION_SELECTED,
      'No main menu action selected. Please select an action to continue.'
    );
  }

  return action as MainMenuChoice;
};

export const handleMainMenu = async (): Promise<MainMenuChoice> => {
  try {
    return promptMainMenu();
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === MainMenuErrors.NO_MAIN_MENU_ACTION_SELECTED) {
        logger.error(error.message);
        return await handleMainMenu();
      }
    }
    throw error;
  }
};
