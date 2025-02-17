import type {
  PkpInfo,
  RegisteredToolWithPolicies,
} from '@lit-protocol/agent-wallet';
import prompts from 'prompts';

import { Admin } from '../admin';
import { LawCliError, logger, GetToolPolicyErrors } from '../../../core';

const promptSelectToolWithPolicy = async (
  toolsWithPolicies: RegisteredToolWithPolicies[]
): Promise<RegisteredToolWithPolicies> => {
  const choices = toolsWithPolicies.map((tool) => ({
    title: tool.name,
    description: `${Object.keys(tool.delegateePolicies).length} policies`,
    value: tool,
  }));

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to view policy:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      GetToolPolicyErrors.GET_TOOL_POLICY_CANCELLED,
      'Tool policy viewing cancelled.'
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
    message: 'Select a Delegatee to view policy for:',
    choices: Object.entries(delegateePolicies).map(([address, policy]) => ({
      title: address,
      description: `Policy: ${policy.policyIpfsCid}`,
      value: address,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      GetToolPolicyErrors.GET_TOOL_POLICY_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  return delegatee;
};

const displayToolPolicy = async (
  admin: Admin,
  pkp: PkpInfo,
  tool: RegisteredToolWithPolicies,
  delegatee: string
) => {
  const policy = tool.delegateePolicies[delegatee];

  logger.info(`Policy details for tool ${tool.name}:`);
  logger.log(`  Tool IPFS CID: ${tool.ipfsCid}`);
  logger.log(`    Status: ${tool.toolEnabled ? 'Enabled' : 'Disabled'}`);
  logger.log(`  Delegatee: ${delegatee}`);
  logger.log(`  Policy IPFS CID: ${policy.policyIpfsCid}`);
  logger.log(`    Status: ${policy.policyEnabled ? 'Enabled' : 'Disabled'}`);

  // Get and display policy parameters if they exist
  const policyParameters =
    await admin.awAdmin.getAllToolPolicyParametersForDelegatee(
      pkp.info.tokenId,
      tool.ipfsCid,
      delegatee
    );

  if (policyParameters && Object.keys(policyParameters).length > 0) {
    logger.log('  Parameters:');
    Object.entries(policyParameters).forEach(([key, value]) => {
      logger.info(`    ${key}: ${value}`);
    });
  } else {
    logger.log('  No policy parameters set');
  }
};

export const handleGetToolPolicy = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    if (
      registeredTools === null ||
      Object.keys(registeredTools.toolsWithPolicies).length === 0
    ) {
      throw new LawCliError(
        GetToolPolicyErrors.NO_TOOLS_WITH_POLICIES,
        'No tools with policies found.'
      );
    }

    const selectedTool = await promptSelectToolWithPolicy(
      Object.values(registeredTools.toolsWithPolicies)
    );
    const selectedDelegatee = await promptSelectDelegatee(
      selectedTool.delegateePolicies
    );

    await displayToolPolicy(admin, pkp, selectedTool, selectedDelegatee);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === GetToolPolicyErrors.GET_TOOL_POLICY_CANCELLED ||
        error.type === GetToolPolicyErrors.NO_TOOLS_WITH_POLICIES
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
