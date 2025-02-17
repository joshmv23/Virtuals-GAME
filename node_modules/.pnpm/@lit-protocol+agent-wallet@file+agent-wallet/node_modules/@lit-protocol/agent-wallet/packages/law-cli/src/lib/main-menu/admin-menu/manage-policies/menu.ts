import prompts from 'prompts';

import { GeneralErrors, LawCliError } from '../../../core';

export enum ManagePoliciesMenuChoice {
  GetAllPolicies = 'getAllPolicies',
  GetToolPolicy = 'getToolPolicy',
  SetPolicy = 'setPolicy',
  RemovePolicy = 'removePolicy',
  EnablePolicy = 'enablePolicy',
  DisablePolicy = 'disablePolicy',
  GetPolicyParameter = 'getPolicyParameter',
  SetPolicyParameter = 'setPolicyParameter',
  RemovePolicyParameter = 'removePolicyParameter',
  Back = 'back',
}

const choices = [
  {
    title: 'Get All Tools and Policies for the Agent Wallet',
    value: ManagePoliciesMenuChoice.GetAllPolicies,
  },
  {
    title: 'Get Tool Policy for a Delegatee',
    value: ManagePoliciesMenuChoice.GetToolPolicy,
  },
  {
    title: 'Set Policy for a Delegatee',
    value: ManagePoliciesMenuChoice.SetPolicy,
  },
  {
    title: 'Remove Policy for a Delegatee',
    value: ManagePoliciesMenuChoice.RemovePolicy,
  },
  {
    title: 'Enable Policy for a Delegatee',
    value: ManagePoliciesMenuChoice.EnablePolicy,
  },
  {
    title: 'Disable Policy for a Delegatee',
    value: ManagePoliciesMenuChoice.DisablePolicy,
  },
  {
    title: 'Get Policy Parameters for a Delegatee',
    value: ManagePoliciesMenuChoice.GetPolicyParameter,
  },
  {
    title: 'Set Policy Parameters for a Delegatee',
    value: ManagePoliciesMenuChoice.SetPolicyParameter,
  },
  {
    title: 'Remove Policy Parameters for a Delegatee',
    value: ManagePoliciesMenuChoice.RemovePolicyParameter,
  },
  {
    title: 'Back',
    value: ManagePoliciesMenuChoice.Back,
  },
];

export const handleManagePoliciesMenu =
  async (): Promise<ManagePoliciesMenuChoice> => {
    const { option } = await prompts({
      type: 'select',
      name: 'option',
      message: 'What would you like to do?',
      choices,
    });

    if (!option) {
      throw new LawCliError(
        GeneralErrors.NO_ACTION_SELECTED,
        'No action selected.'
      );
    }

    return option;
  };
