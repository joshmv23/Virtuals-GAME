import prompts from 'prompts';
import {
  PkpInfo,
  RegisteredToolsResult,
  type RegisteredToolWithPolicies,
} from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, RemovePolicyErrors } from '../../../core';

const promptSelectToolWithPolicy = async (
  registeredTools: RegisteredToolsResult
): Promise<RegisteredToolWithPolicies> => {
  // Get only tools with policies
  const toolsWithPolicies = registeredTools.toolsWithPolicies;

  if (Object.keys(toolsWithPolicies).length === 0) {
    throw new LawCliError(
      RemovePolicyErrors.NO_POLICIES_FOUND,
      'No tools with policies found.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to remove policy from:',
    choices: Object.entries(toolsWithPolicies).map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: `${Object.keys(tool.delegateePolicies).length} policies`,
      value: tool,
    })),
  });

  if (!tool) {
    throw new LawCliError(
      RemovePolicyErrors.REMOVE_POLICY_CANCELLED,
      'Tool selection cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegatee = async (
  delegateePolicies: Record<string, any>
): Promise<string> => {
  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to remove policy for:',
    choices: Object.entries(delegateePolicies).map(([address, policy]) => ({
      title: address,
      description: `Policy: ${policy.policyIpfsCid}`,
      value: address,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      RemovePolicyErrors.REMOVE_POLICY_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  return delegatee;
};

const promptConfirmRemoval = async (
  toolName: string,
  delegatee: string
): Promise<boolean> => {
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Are you sure you want to remove the policy for tool ${toolName} and delegatee ${delegatee}?`,
    initial: false,
  });

  if (!confirmed) {
    throw new LawCliError(
      RemovePolicyErrors.REMOVE_POLICY_CANCELLED,
      'Policy removal cancelled.'
    );
  }

  return confirmed;
};

export const handleRemovePolicy = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolWithPolicy(registeredTools);
    const selectedDelegatee = await promptSelectDelegatee(
      selectedTool.delegateePolicies
    );

    await promptConfirmRemoval(selectedTool.name, selectedDelegatee);

    await admin.awAdmin.removeToolPolicyForDelegatee(
      pkp.info.tokenId,
      selectedTool.ipfsCid,
      selectedDelegatee
    );

    logger.success(
      `Policy removed successfully for tool ${selectedTool.name} and delegatee ${selectedDelegatee}.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === RemovePolicyErrors.REMOVE_POLICY_CANCELLED ||
        error.type === RemovePolicyErrors.NO_POLICIES_FOUND
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
