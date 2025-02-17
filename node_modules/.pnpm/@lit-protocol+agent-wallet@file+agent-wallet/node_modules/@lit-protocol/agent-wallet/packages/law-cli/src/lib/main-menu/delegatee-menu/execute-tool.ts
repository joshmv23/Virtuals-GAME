import { type DelegatedPkpInfo, type AwTool } from '@lit-protocol/agent-wallet';
import prompts from 'prompts';

import { Delegatee } from './delegatee';
import { LawCliError, logger, DelegateeErrors, LocalStorage } from '../../core';
import { getToolParams } from './get-tool-params';

/**
 * Prompts the user to select a tool from a list of available tools.
 */
const promptSelectTool = async (
  toolsWithPolicies: AwTool<any, any>[],
  toolsWithoutPolicies: AwTool<any, any>[]
) => {
  const choices = [
    ...toolsWithPolicies.map((tool) => ({
      title: `${tool.name} (with policy)`,
      description: `IPFS CID: ${tool.ipfsCid}`,
      value: tool,
    })),
    ...toolsWithoutPolicies.map((tool) => ({
      title: tool.name,
      description: `IPFS CID: ${tool.ipfsCid}`,
      value: tool,
    })),
  ];

  if (choices.length === 0) {
    throw new LawCliError(
      DelegateeErrors.NO_TOOLS_AVAILABLE,
      'No tools available to select'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to execute:',
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
 * Handles the process of executing a tool.
 * This function displays available tools, prompts for tool selection and parameters,
 * and executes the selected tool with the provided parameters.
 */
export const handleExecuteTool = async (
  localStorage: LocalStorage,
  delegatee: Delegatee,
  pkp: DelegatedPkpInfo
): Promise<void> => {
  try {
    // Get registered tools for the PKP
    const registeredTools = await delegatee.awDelegatee.getPermittedToolsForPkp(
      pkp.tokenId
    );

    // Check if there are any tools available
    if (
      Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
      Object.keys(registeredTools.toolsWithoutPolicies).length === 0
    ) {
      logger.error('No registered tools found for this PKP.');
      return;
    }

    // Display available tools
    if (Object.keys(registeredTools.toolsWithPolicies).length > 0) {
      logger.info(`Tools with Policies for PKP ${pkp.ethAddress}:`);
      Object.values(registeredTools.toolsWithPolicies).forEach((tool) => {
        logger.log(`  - ${tool.name} (${tool.ipfsCid})`);
      });
    }

    if (Object.keys(registeredTools.toolsWithoutPolicies).length > 0) {
      logger.info(`Tools without Policies for PKP ${pkp.ethAddress}:`);
      Object.values(registeredTools.toolsWithoutPolicies).forEach((tool) => {
        logger.log(`  - ${tool.name} (${tool.ipfsCid})`);
      });
    }

    // Prompt user to select a tool
    const selectedTool = await promptSelectTool(
      Object.values(registeredTools.toolsWithPolicies),
      Object.values(registeredTools.toolsWithoutPolicies)
    );

    // If the tool has a policy, display it
    const toolWithPolicy = Object.values(
      registeredTools.toolsWithPolicies
    ).find((tool) => tool.ipfsCid === selectedTool.ipfsCid);
    if (toolWithPolicy) {
      const policy = await delegatee.awDelegatee.getToolPolicy(
        pkp.tokenId,
        selectedTool.ipfsCid
      );
      logger.info('Tool Policy:');
      logger.log(`  Policy IPFS CID: ${policy.policyIpfsCid}`);
      logger.log(`  Policy Enabled: ${policy.enabled ? '✅' : '❌'}`);
    }

    // Prompt for tool parameters
    logger.info('Enter Tool Parameters:');
    const params = await getToolParams(
      localStorage,
      selectedTool,
      pkp.ethAddress
    );

    // Execute the tool
    logger.info('Executing tool...');
    const response = await delegatee.awDelegatee.executeTool({
      ipfsId: selectedTool.ipfsCid,
      jsParams: {
        params,
      },
    });

    logger.info('Tool executed');
    logger.log(JSON.stringify(response, null, 2));
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === DelegateeErrors.NO_TOOLS_AVAILABLE) {
        logger.error('No tools available for the selected PKP');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_SELECTION_CANCELLED) {
        logger.error('No tool selected');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_PARAMS_CANCELLED) {
        logger.error('Tool parameter input cancelled');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_PARAMS_INVALID) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
