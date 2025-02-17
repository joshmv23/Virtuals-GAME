import prompts from 'prompts';

import { GeneralErrors, LawCliError, logger } from '../../core';
import type { Admin } from './admin';
import { PkpInfo } from '@lit-protocol/agent-wallet';

export enum AdminMenuChoice {
  AdminSettings = 'adminSettings',
  SelectPkp = 'selectPkp',
  ManageTools = 'manageTools',
  ManagePolicies = 'managePolicies',
  ManageDelegatees = 'manageDelegatees',
  Back = 'back',
}

const promptAdminMenu = async (
  admin?: Admin,
  pkp?: PkpInfo
): Promise<AdminMenuChoice> => {
  const disableManageOptions = !admin;
  if (disableManageOptions) {
    logger.warn(
      'Admin role not initialized. Please configure the admin role before managing tools, policies, or delegatees.'
    );
  }

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Admin Settings',
        value: AdminMenuChoice.AdminSettings,
      },
      {
        title: 'Select Agent Wallet to Manage',
        description: pkp
          ? `Currently managing: ${pkp.info.ethAddress}`
          : 'No Agent Wallet selected',
        value: AdminMenuChoice.SelectPkp,
        disabled: disableManageOptions,
      },
      {
        title: 'Manage Tools',
        value: AdminMenuChoice.ManageTools,
        disabled: disableManageOptions,
      },
      {
        title: 'Manage Policies',
        value: AdminMenuChoice.ManagePolicies,
        disabled: disableManageOptions,
      },
      {
        title: 'Manage Delegatees',
        value: AdminMenuChoice.ManageDelegatees,
        disabled: disableManageOptions,
      },
      { title: 'Back', value: AdminMenuChoice.Back },
    ],
  });

  if (!action) {
    throw new LawCliError(
      GeneralErrors.NO_ACTION_SELECTED,
      'No admin menu action selected. Please select an action to continue.'
    );
  }

  return action as AdminMenuChoice;
};

export const handleAdminMenu = async (
  admin?: Admin,
  pkp?: PkpInfo
): Promise<AdminMenuChoice> => {
  try {
    return promptAdminMenu(admin, pkp);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
        logger.error(error.message);
        return await handleAdminMenu(admin);
      }
    }
    throw error;
  }
};
