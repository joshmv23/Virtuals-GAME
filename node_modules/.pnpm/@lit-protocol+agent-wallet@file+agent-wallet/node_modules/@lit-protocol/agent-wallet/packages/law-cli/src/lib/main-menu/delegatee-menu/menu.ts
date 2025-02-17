import prompts from 'prompts';
import { DelegatedPkpInfo } from '@lit-protocol/agent-wallet';

import { GeneralErrors, LawCliError, logger } from '../../core';
import type { Delegatee } from './delegatee';

export enum DelegateeMenuChoice {
  DelegateeSettings = 'delegateeSettings',
  SelectPkp = 'selectPkp',
  GetDelegatedPkps = 'getDelegatedPkps',
  GetRegisteredTools = 'getRegisteredTools',
  GetToolPolicy = 'getToolPolicy',
  GetToolViaIntent = 'getToolViaIntent',
  ExecuteToolViaIntent = 'executeToolViaIntent',
  ExecuteTool = 'executeTool',
  Back = 'back',
}

const promptDelegateeMenu = async (
  delegatee?: Delegatee,
  delegatedPkp?: DelegatedPkpInfo
): Promise<DelegateeMenuChoice> => {
  const disableManageOptions = !delegatee;
  if (disableManageOptions) {
    logger.warn(
      'Delegatee role not initialized. Please configure the delegatee role before executing tools.'
    );
  }

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Delegatee Settings',
        value: DelegateeMenuChoice.DelegateeSettings,
      },
      {
        title: 'Select Agent Wallet to Use',
        description: delegatedPkp
          ? `Currently using: ${delegatedPkp.ethAddress}`
          : 'No Agent Wallet selected',
        value: DelegateeMenuChoice.SelectPkp,
        disabled: disableManageOptions,
      },
      {
        title: 'Get Delegated Agent Wallets',
        value: DelegateeMenuChoice.GetDelegatedPkps,
        disabled: disableManageOptions,
      },
      {
        title: 'Get Registered Tools for Agent Wallet',
        value: DelegateeMenuChoice.GetRegisteredTools,
        disabled: disableManageOptions,
      },
      {
        title: 'Get Tool Policy for Agent Wallet',
        value: DelegateeMenuChoice.GetToolPolicy,
        disabled: disableManageOptions,
      },
      {
        title: 'Get Tool via Intent for Agent Wallet',
        value: DelegateeMenuChoice.GetToolViaIntent,
        disabled: disableManageOptions,
      },
      {
        title: 'Execute Tool via Intent Using Agent Wallet',
        value: DelegateeMenuChoice.ExecuteToolViaIntent,
        disabled: disableManageOptions,
      },
      {
        title: 'Execute Tool Using Agent Wallet',
        value: DelegateeMenuChoice.ExecuteTool,
        disabled: disableManageOptions,
      },
      { title: 'Back', value: DelegateeMenuChoice.Back },
    ],
  });

  if (!action) {
    throw new LawCliError(
      GeneralErrors.NO_ACTION_SELECTED,
      'No admin menu action selected. Please select an action to continue.'
    );
  }

  return action as DelegateeMenuChoice;
};

export const handleDelegateeMenu = async (
  delegatee?: Delegatee,
  delegatedPkp?: DelegatedPkpInfo
): Promise<DelegateeMenuChoice> => {
  try {
    return promptDelegateeMenu(delegatee, delegatedPkp);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === GeneralErrors.NO_ACTION_SELECTED) {
        logger.error(error.message);
        return await handleDelegateeMenu(delegatee);
      }
    }
    throw error;
  }
};
