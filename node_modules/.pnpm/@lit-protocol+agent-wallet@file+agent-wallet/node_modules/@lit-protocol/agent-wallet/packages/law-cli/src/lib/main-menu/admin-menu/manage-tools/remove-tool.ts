import prompts from 'prompts';
import { PkpInfo, RegisteredToolsResult } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, RemoveToolErrors } from '../../../core';

/**
 * Prompts the user to select a tool to remove from the list of registered tools.
 * This function filters and presents only the tools that are currently registered.
 *
 * @param registeredTools - Object containing information about registered tools
 * @returns The IPFS CID and name of the selected tool
 * @throws LawCliError - If no registered tools are found or the user cancels the selection
 */
const promptSelectToolToRemove = async (
  registeredTools: RegisteredToolsResult
) => {
  // Combine tools with and without policies
  const allTools = {
    ...registeredTools.toolsWithPolicies,
    ...registeredTools.toolsWithoutPolicies,
  };

  if (Object.keys(allTools).length === 0) {
    throw new LawCliError(
      RemoveToolErrors.NO_PERMITTED_TOOLS,
      'No registered tools found to remove.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to remove:',
    choices: Object.entries(allTools).map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: tool.description,
      value: { ipfsCid, name: tool.name },
    })),
  });

  if (!tool) {
    throw new LawCliError(
      RemoveToolErrors.REMOVE_TOOL_CANCELLED,
      'Tool removal cancelled.'
    );
  }

  return tool;
};

const promptConfirmRemoval = async (toolName: string): Promise<boolean> => {
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Are you sure you want to remove tool "${toolName}"?`,
    initial: false,
  });

  if (!confirmed) {
    throw new LawCliError(
      RemoveToolErrors.REMOVE_TOOL_CANCELLED,
      'Tool removal cancelled.'
    );
  }

  return confirmed;
};

export const handleRemoveTool = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolToRemove(registeredTools);

    await promptConfirmRemoval(selectedTool.name);

    await admin.awAdmin.removeTool(pkp.info.tokenId, selectedTool.ipfsCid);

    logger.success(`Tool ${selectedTool.name} removed successfully.`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === RemoveToolErrors.REMOVE_TOOL_CANCELLED ||
        error.type === RemoveToolErrors.NO_PERMITTED_TOOLS
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
