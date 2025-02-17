import prompts from 'prompts';

import { LawCliError, GeneralErrors, logger } from '../../../core';

export enum ManageRpcsMenuChoice {
  AddRpc = 'addRpc',
  EditRpc = 'editRpc',
  RemoveRpc = 'removeRpc',
  Back = 'back',
}

const promptManageRpcsMenu = async (): Promise<ManageRpcsMenuChoice> => {
  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Add RPC',
        value: ManageRpcsMenuChoice.AddRpc,
      },
      { title: 'Edit RPC', value: ManageRpcsMenuChoice.EditRpc },
      { title: 'Remove RPC', value: ManageRpcsMenuChoice.RemoveRpc },
      { title: 'Back', value: ManageRpcsMenuChoice.Back },
    ],
  });

  if (!action) {
    throw new LawCliError(
      GeneralErrors.NO_ACTION_SELECTED,
      'No action selected. Please select an action to continue.'
    );
  }

  return action as ManageRpcsMenuChoice;
};

export const handleManageRpcsMenu = async (): Promise<ManageRpcsMenuChoice> => {
  try {
    return promptManageRpcsMenu();
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
        logger.error(error.message);
        return await handleManageRpcsMenu();
      }
    }
    throw error;
  }
};
