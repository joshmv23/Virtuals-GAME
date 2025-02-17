import prompts from 'prompts';

import { Admin } from '../admin';
import {
  GeneralErrors,
  LawCliError,
  logger,
  ManageDelegateesMenuErrors,
} from '../../../core';

export enum ManageDelegateesMenuChoice {
  GetDelegatees = 'getDelegatees',
  IsDelegatee = 'isDelegatee',
  AddDelegatee = 'addDelegatee',
  RemoveDelegatee = 'removeDelegatee',
  PermitTool = 'permitTool',
  UnpermitTool = 'unpermitTool',
  Back = 'back',
}

const promptManageDelegateesMenu =
  async (): Promise<ManageDelegateesMenuChoice> => {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'Select a delegatee management action:',
      choices: [
        {
          title: 'Get Delegatees',
          value: ManageDelegateesMenuChoice.GetDelegatees,
        },
        {
          title: 'Check if Address is Delegatee',
          value: ManageDelegateesMenuChoice.IsDelegatee,
        },
        {
          title: 'Add Delegatee',
          value: ManageDelegateesMenuChoice.AddDelegatee,
        },
        {
          title: 'Remove Delegatee',
          value: ManageDelegateesMenuChoice.RemoveDelegatee,
        },
        {
          title: 'Permit Tool for Delegatee',
          value: ManageDelegateesMenuChoice.PermitTool,
        },
        {
          title: 'Unpermit Tool for Delegatee',
          value: ManageDelegateesMenuChoice.UnpermitTool,
        },
        {
          title: 'Back',
          value: ManageDelegateesMenuChoice.Back,
        },
      ],
    });

    if (!action) {
      throw new LawCliError(
        ManageDelegateesMenuErrors.NO_MANAGE_DELEGATEES_ACTION_SELECTED,
        'No delegatee management action selected.'
      );
    }

    return action;
  };

export const handleManageDelegateesMenu = async (
  admin?: Admin
): Promise<ManageDelegateesMenuChoice> => {
  try {
    return promptManageDelegateesMenu();
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
        logger.error(error.message);
        return await handleManageDelegateesMenu(admin);
      }
    }
    throw error;
  }
};
