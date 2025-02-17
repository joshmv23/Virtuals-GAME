import prompts from 'prompts';
import { PkpInfo, RegisteredToolsResult } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, DisablePolicyErrors } from '../../../core';

const promptSelectToolWithEnabledPolicy = async (
  registeredTools: RegisteredToolsResult
) => {
  // Get only tools with policies
  const toolsWithPolicies = registeredTools.toolsWithPolicies;

  // Filter for tools with enabled policies
  const toolsWithEnabledPolicies = Object.entries(toolsWithPolicies).filter(
    ([_, tool]) =>
      Object.values(tool.delegateePolicies).some(
        (policy) => policy.policyEnabled
      )
  );

  if (toolsWithEnabledPolicies.length === 0) {
    throw new LawCliError(
      DisablePolicyErrors.NO_ENABLED_POLICIES,
      'No enabled policies found.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to disable policy for:',
    choices: toolsWithEnabledPolicies.map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: `${
        Object.values(tool.delegateePolicies).filter(
          (policy) => policy.policyEnabled
        ).length
      } enabled policies`,
      value: {
        ipfsCid,
        name: tool.name,
        delegateePolicies: tool.delegateePolicies,
      },
    })),
  });

  if (!tool) {
    throw new LawCliError(
      DisablePolicyErrors.DISABLE_POLICY_CANCELLED,
      'Tool selection cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegatee = async (
  delegateePolicies: Record<string, any>
) => {
  // Filter for delegatees with enabled policies
  const enabledPolicies = Object.entries(delegateePolicies).filter(
    ([_, policy]) => policy.policyEnabled
  );

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to disable policy for:',
    choices: enabledPolicies.map(([address, policy]) => ({
      title: address,
      description: `Policy: ${policy.policyIpfsCid}`,
      value: address,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      DisablePolicyErrors.DISABLE_POLICY_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  return delegatee;
};

const promptConfirmDisable = async (
  toolName: string,
  delegatee: string
): Promise<boolean> => {
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Are you sure you want to disable the policy for tool "${toolName}" and delegatee "${delegatee}"?`,
    initial: false,
  });

  if (!confirmed) {
    throw new LawCliError(
      DisablePolicyErrors.DISABLE_POLICY_CANCELLED,
      'Policy disable cancelled.'
    );
  }

  return confirmed;
};

export const handleDisablePolicy = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolWithEnabledPolicy(
      registeredTools
    );
    const selectedDelegatee = await promptSelectDelegatee(
      selectedTool.delegateePolicies
    );

    await promptConfirmDisable(selectedTool.name, selectedDelegatee);

    await admin.awAdmin.disableToolPolicyForDelegatee(
      pkp.info.tokenId,
      selectedTool.ipfsCid,
      selectedDelegatee
    );

    logger.success(
      `Policy disabled successfully for tool ${selectedTool.name} and delegatee ${selectedDelegatee}.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === DisablePolicyErrors.DISABLE_POLICY_CANCELLED ||
        error.type === DisablePolicyErrors.NO_ENABLED_POLICIES
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
