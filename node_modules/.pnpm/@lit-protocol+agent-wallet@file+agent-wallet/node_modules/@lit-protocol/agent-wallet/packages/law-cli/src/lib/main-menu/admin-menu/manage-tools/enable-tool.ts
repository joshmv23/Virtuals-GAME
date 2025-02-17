import prompts from 'prompts';
import { PkpInfo, RegisteredToolsResult } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, EnableToolErrors } from '../../../core';

/**
 * Prompts the user to select a tool to enable from the list of registered tools.
 * This function filters and presents only the tools that are currently disabled.
 *
 * @param registeredTools - Object containing information about registered tools
 * @returns The IPFS CID and name of the selected tool
 * @throws LawCliError - If no disabled tools are found or the user cancels the selection
 */
const promptSelectToolToEnable = async (
  registeredTools: RegisteredToolsResult
) => {
  // Combine tools with and without policies
  const allTools = {
    ...registeredTools.toolsWithPolicies,
    ...registeredTools.toolsWithoutPolicies,
  };

  // Filter for disabled tools
  const disabledTools = Object.entries(allTools).filter(
    ([_, tool]) => !tool.toolEnabled
  );

  if (disabledTools.length === 0) {
    throw new LawCliError(
      EnableToolErrors.NO_DISABLED_TOOLS,
      'No disabled tools found to enable.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to enable:',
    choices: disabledTools.map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: tool.description,
      value: { ipfsCid, name: tool.name },
    })),
  });

  if (!tool) {
    throw new LawCliError(
      EnableToolErrors.ENABLE_TOOL_CANCELLED,
      'Tool enabling cancelled.'
    );
  }

  return tool;
};

export const handleEnableTool = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolToEnable(registeredTools);

    await admin.awAdmin.enableTool(pkp.info.tokenId, selectedTool.ipfsCid);

    logger.success(`Tool ${selectedTool.name} enabled successfully.`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === EnableToolErrors.ENABLE_TOOL_CANCELLED ||
        error.type === EnableToolErrors.NO_DISABLED_TOOLS
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
