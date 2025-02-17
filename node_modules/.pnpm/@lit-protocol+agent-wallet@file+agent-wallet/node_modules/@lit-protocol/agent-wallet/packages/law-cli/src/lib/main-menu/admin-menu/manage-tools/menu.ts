import prompts from 'prompts';

import { GeneralErrors, LawCliError, logger } from '../../../core';

export enum ManageToolsMenuChoice {
  PermitTool = 'permitTool',
  RemoveTool = 'removeTool',
  EnableTool = 'enableTool',
  DisableTool = 'disableTool',
  GetRegisteredTools = 'getRegisteredTools',
  Back = 'back',
}

const promptManageToolsMenu = async (): Promise<ManageToolsMenuChoice> => {
  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Get Registered Tools',
        value: ManageToolsMenuChoice.GetRegisteredTools,
      },
      {
        title: 'Permit Tool',
        value: ManageToolsMenuChoice.PermitTool,
      },
      {
        title: 'Remove Tool',
        value: ManageToolsMenuChoice.RemoveTool,
      },
      {
        title: 'Enable Tool',
        value: ManageToolsMenuChoice.EnableTool,
      },
      {
        title: 'Disable Tool',
        value: ManageToolsMenuChoice.DisableTool,
      },
      { title: 'Back', value: ManageToolsMenuChoice.Back },
    ],
  });

  if (!action) {
    throw new LawCliError(
      GeneralErrors.NO_ACTION_SELECTED,
      'No action selected. Please select an action to continue.'
    );
  }

  return action as ManageToolsMenuChoice;
};

export const handleManageToolsMenu =
  async (): Promise<ManageToolsMenuChoice> => {
    try {
      return promptManageToolsMenu();
    } catch (error) {
      if (error instanceof LawCliError) {
        if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
          logger.error(error.message);
          return await handleManageToolsMenu();
        }
      }
      throw error;
    }
  };
