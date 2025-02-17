import { type DelegatedPkpInfo, type AwTool } from '@lit-protocol/agent-wallet';
import prompts from 'prompts';

import { Delegatee } from './delegatee';
import { LawCliError, logger, DelegateeErrors } from '../../core';

/**
 * Prompts the user to select a tool from a list of tools with policies.
 * Each tool is displayed with its name and IPFS CID.
 */
const promptSelectTool = async (toolsWithPolicies: AwTool<any, any>[]) => {
  const choices = toolsWithPolicies.map((tool) => ({
    title: tool.name,
    description: `IPFS CID: ${tool.ipfsCid}`,
    value: tool,
  }));

  if (choices.length === 0) {
    throw new LawCliError(
      DelegateeErrors.NO_TOOLS_WITH_POLICIES,
      'No tools with policies available to select'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      DelegateeErrors.TOOL_SELECTION_CANCELLED,
      'Tool selection was cancelled'
    );
  }

  return tool as AwTool<any, any>;
};

/**
 * Handles the process of retrieving and displaying the policy for a selected tool registered under a specific PKP.
 * This function prompts the user to select a tool from the available tools with policies,
 * retrieves the tool's policy, and logs the result.
 */
export const handleGetToolPolicyForDelegatee = async (
  delegatee: Delegatee,
  pkp: DelegatedPkpInfo
): Promise<void> => {
  try {
    // Retrieve the list of registered tools for the PKP
    const registeredTools = await delegatee.awDelegatee.getPermittedToolsForPkp(
      pkp.tokenId
    );

    // Check if there are any tools with policies
    if (Object.keys(registeredTools.toolsWithPolicies).length === 0) {
      logger.error('No registered tools with a policy found for this PKP.');
      return;
    }

    // Prompt user to select a tool
    const selectedTool = await promptSelectTool(
      Object.values(registeredTools.toolsWithPolicies)
    );

    // Get the policy for the selected tool
    const policy = await delegatee.awDelegatee.getToolPolicy(
      pkp.tokenId,
      selectedTool.ipfsCid
    );

    // Log the tool policy details
    logger.info(
      `Tool Policy for PKP ${pkp.ethAddress} and Tool ${selectedTool.ipfsCid}:`
    );
    logger.log(`  Policy IPFS CID: ${policy.policyIpfsCid}`);
    logger.log(`  Policy Enabled: ${policy.enabled ? '✅' : '❌'}`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === DelegateeErrors.NO_TOOLS_WITH_POLICIES) {
        logger.error('No tools with policies available for the selected PKP');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_SELECTION_CANCELLED) {
        logger.error('No tool selected');
        return;
      }
    }
    throw error;
  }
};
