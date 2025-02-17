import prompts from 'prompts';
import { PkpInfo, RegisteredToolsResult } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, EnablePolicyErrors } from '../../../core';

const promptSelectToolWithDisabledPolicy = async (
  registeredTools: RegisteredToolsResult
) => {
  // Get only tools with policies
  const toolsWithPolicies = registeredTools.toolsWithPolicies;

  // Filter for tools with disabled policies
  const toolsWithDisabledPolicies = Object.entries(toolsWithPolicies).filter(
    ([_, tool]) =>
      Object.values(tool.delegateePolicies).some(
        (policy) => !policy.policyEnabled
      )
  );

  if (toolsWithDisabledPolicies.length === 0) {
    throw new LawCliError(
      EnablePolicyErrors.NO_DISABLED_POLICIES,
      'No disabled policies found.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to enable policy for:',
    choices: toolsWithDisabledPolicies.map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: `${
        Object.values(tool.delegateePolicies).filter(
          (policy) => !policy.policyEnabled
        ).length
      } disabled policies`,
      value: {
        ipfsCid,
        name: tool.name,
        delegateePolicies: tool.delegateePolicies,
      },
    })),
  });

  if (!tool) {
    throw new LawCliError(
      EnablePolicyErrors.ENABLE_POLICY_CANCELLED,
      'Tool selection cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegatee = async (
  delegateePolicies: Record<string, any>
) => {
  // Filter for delegatees with disabled policies
  const disabledPolicies = Object.entries(delegateePolicies).filter(
    ([_, policy]) => !policy.policyEnabled
  );

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to enable policy for:',
    choices: disabledPolicies.map(([address, policy]) => ({
      title: address,
      description: `Policy: ${policy.policyIpfsCid}`,
      value: address,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      EnablePolicyErrors.ENABLE_POLICY_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  return delegatee;
};

export const handleEnablePolicy = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolWithDisabledPolicy(
      registeredTools
    );
    const selectedDelegatee = await promptSelectDelegatee(
      selectedTool.delegateePolicies
    );

    await admin.awAdmin.enableToolPolicyForDelegatee(
      pkp.info.tokenId,
      selectedTool.ipfsCid,
      selectedDelegatee
    );

    logger.success(
      `Policy enabled successfully for tool ${selectedTool.name} and delegatee ${selectedDelegatee}.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === EnablePolicyErrors.ENABLE_POLICY_CANCELLED ||
        error.type === EnablePolicyErrors.NO_DISABLED_POLICIES
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
