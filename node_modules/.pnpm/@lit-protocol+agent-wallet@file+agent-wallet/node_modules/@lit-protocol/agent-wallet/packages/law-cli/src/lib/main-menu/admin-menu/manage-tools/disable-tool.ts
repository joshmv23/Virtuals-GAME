import prompts from 'prompts';
import { PkpInfo, RegisteredToolsResult } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, DisableToolErrors } from '../../../core';

/**
 * Prompts the user to select a tool to disable from the list of registered tools.
 * This function filters and presents only the tools that are currently enabled.
 *
 * @param registeredTools - Object containing information about registered tools
 * @returns The IPFS CID and name of the selected tool
 * @throws LawCliError - If no enabled tools are found or the user cancels the selection
 */
const promptSelectToolToDisable = async (
  registeredTools: RegisteredToolsResult
) => {
  // Combine tools with and without policies
  const allTools = {
    ...registeredTools.toolsWithPolicies,
    ...registeredTools.toolsWithoutPolicies,
  };

  // Filter for enabled tools
  const enabledTools = Object.entries(allTools).filter(
    ([_, tool]) => tool.toolEnabled
  );

  if (enabledTools.length === 0) {
    throw new LawCliError(
      DisableToolErrors.NO_ENABLED_TOOLS,
      'No enabled tools found to disable.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to disable:',
    choices: enabledTools.map(([ipfsCid, tool]) => ({
      title: tool.name,
      description: tool.description,
      value: { ipfsCid, name: tool.name },
    })),
  });

  if (!tool) {
    throw new LawCliError(
      DisableToolErrors.DISABLE_TOOL_CANCELLED,
      'Tool disabling cancelled.'
    );
  }

  return tool;
};

export const handleDisableTool = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    const selectedTool = await promptSelectToolToDisable(registeredTools);

    await admin.awAdmin.disableTool(pkp.info.tokenId, selectedTool.ipfsCid);

    logger.success(`Tool ${selectedTool.name} disabled successfully.`);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === DisableToolErrors.DISABLE_TOOL_CANCELLED ||
        error.type === DisableToolErrors.NO_ENABLED_TOOLS
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
