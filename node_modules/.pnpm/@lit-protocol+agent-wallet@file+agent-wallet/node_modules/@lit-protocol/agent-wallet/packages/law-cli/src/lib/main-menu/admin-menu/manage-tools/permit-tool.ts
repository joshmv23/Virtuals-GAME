import prompts from 'prompts';
import {
  AwTool,
  listToolsByNetwork,
  LitNetwork,
  type PkpInfo,
  RegisteredToolsResult,
} from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, PermitToolErrors } from '../../../core';

/**
 * Prompts the user to select a tool to permit, filtering out already permitted tools.
 * This function retrieves the list of available tools for the specified Lit network,
 * filters out tools that are already permitted, and prompts the user to select a tool.
 *
 * @param litNetwork - The Lit network for which to retrieve available tools.
 * @param alreadyPermittedTools - An object containing tools that are already permitted.
 * @returns The selected tool to permit.
 * @throws AwCliError - If no unpermitted tools are found or the user cancels the selection.
 */
export const promptSelectToolToPermit = async (
  litNetwork: LitNetwork,
  alreadyPermittedTools: RegisteredToolsResult | null
) => {
  // Retrieve the list of available tools for the specified Lit network.
  const availableTools = listToolsByNetwork(litNetwork);

  // Create a set of IPFS CIDs for already permitted tools for efficient lookup.
  const permittedCids = new Set([
    ...(alreadyPermittedTools
      ? Object.keys(alreadyPermittedTools.toolsWithPolicies)
      : []),
    ...(alreadyPermittedTools
      ? Object.keys(alreadyPermittedTools.toolsWithoutPolicies)
      : []),
  ]);

  // Filter out tools that are already permitted.
  const unpermittedTools = availableTools.filter(
    (tool: AwTool<any, any>) => !permittedCids.has(tool.ipfsCid)
  );

  // If no unpermitted tools are found, throw an error.
  if (unpermittedTools.length === 0) {
    throw new LawCliError(
      PermitToolErrors.NO_UNPERMITTED_TOOLS,
      'No unpermitted tools found.'
    );
  }

  // Prompt the user to select a tool to permit.
  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to permit:',
    choices: unpermittedTools.map((tool: AwTool<any, any>) => ({
      title: tool.name,
      description: tool.description,
      value: tool,
    })),
  });

  // If the user cancels the selection, throw an error.
  if (!tool) {
    throw new LawCliError(
      PermitToolErrors.PERMIT_TOOL_CANCELLED,
      'Tool permitting cancelled.'
    );
  }

  // Return the selected tool.
  return tool as AwTool<any, any>;
};

const promptEnableTool = async (): Promise<boolean> => {
  const { enableTool } = await prompts({
    type: 'confirm',
    name: 'enableTool',
    message: 'Enable tool after permitting?',
    initial: true,
  });

  if (enableTool === undefined) {
    throw new LawCliError(
      PermitToolErrors.ENABLE_TOOL_CANCELLED,
      'Enable tool selection cancelled.'
    );
  }

  return enableTool;
};

export const handlePermitTool = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolToPermit(
      admin.awAdmin.litNetwork,
      registeredTools
    );

    const shouldEnableTool = await promptEnableTool();

    await admin.awAdmin.registerTool(pkp.info.tokenId, selectedTool.ipfsCid, {
      enableTools: shouldEnableTool,
    });

    logger.success(
      `Tool ${selectedTool.name} registered successfully${
        shouldEnableTool ? ' and enabled' : ''
      }.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === PermitToolErrors.PERMIT_TOOL_CANCELLED ||
        error.type === PermitToolErrors.ENABLE_TOOL_CANCELLED
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
