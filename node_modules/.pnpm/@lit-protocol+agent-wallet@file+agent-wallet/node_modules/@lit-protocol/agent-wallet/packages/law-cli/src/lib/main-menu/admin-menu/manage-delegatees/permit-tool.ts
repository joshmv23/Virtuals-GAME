import prompts from 'prompts';
import type {
  PkpInfo,
  RegisteredToolsResult,
  RegisteredToolWithPolicies,
  ToolMetadata,
  ToolInfoWithDelegateePolicy,
} from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import {
  LawCliError,
  logger,
  PermitToolForDelegateeErrors,
} from '../../../core';

const promptSelectDelegateeToPermitToolFor = async (
  delegatees: string[]
): Promise<string> => {
  if (delegatees.length === 0) {
    throw new LawCliError(
      PermitToolForDelegateeErrors.NO_DELEGATEES_FOUND,
      'No delegatees found for PKP.'
    );
  }

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to permit tool for:',
    choices: delegatees.map((delegatee) => ({
      title: delegatee,
      value: delegatee,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      PermitToolForDelegateeErrors.PERMIT_TOOL_FOR_DELEGATEE_CANCELLED,
      'Permit tool for delegatee cancelled.'
    );
  }

  return delegatee;
};

const promptSelectToolToPermit = async (
  registeredTools: RegisteredToolsResult,
  permittedTools: ToolInfoWithDelegateePolicy[]
): Promise<RegisteredToolWithPolicies | ToolMetadata> => {
  // Filter out tools that are already permitted for this delegatee
  const permittedToolIpfsCids = new Set(
    permittedTools.map((tool) => tool.toolIpfsCid)
  );

  const filteredToolsWithPolicies = Object.fromEntries(
    Object.entries(registeredTools.toolsWithPolicies).filter(
      ([toolIpfsCid]) => !permittedToolIpfsCids.has(toolIpfsCid)
    )
  );

  const filteredToolsWithoutPolicies = Object.fromEntries(
    Object.entries(registeredTools.toolsWithoutPolicies).filter(
      ([toolIpfsCid]) => !permittedToolIpfsCids.has(toolIpfsCid)
    )
  );

  const filteredToolsUnknownWithPolicies = Object.fromEntries(
    Object.entries(registeredTools.toolsUnknownWithPolicies).filter(
      ([toolIpfsCid]) => !permittedToolIpfsCids.has(toolIpfsCid)
    )
  );

  // Update registeredTools with the filtered results
  registeredTools.toolsWithPolicies = filteredToolsWithPolicies;
  registeredTools.toolsWithoutPolicies = filteredToolsWithoutPolicies;
  registeredTools.toolsUnknownWithPolicies = filteredToolsUnknownWithPolicies;

  if (
    registeredTools === null ||
    (Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
      Object.keys(registeredTools.toolsWithoutPolicies).length === 0 &&
      Object.keys(registeredTools.toolsUnknownWithPolicies).length === 0)
  ) {
    throw new LawCliError(
      PermitToolForDelegateeErrors.NO_TOOLS_FOUND,
      'No unpermitted tools found.'
    );
  }

  const choices = [
    ...Object.values(registeredTools.toolsWithPolicies).map((tool) => ({
      title: tool.name,
      description: tool.description,
      value: tool,
    })),
    ...Object.values(registeredTools.toolsWithoutPolicies).map((tool) => ({
      title: tool.name,
      description: tool.description,
      value: tool,
    })),
  ];

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to permit for delegatee:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      PermitToolForDelegateeErrors.PERMIT_TOOL_FOR_DELEGATEE_CANCELLED,
      'Permit tool for delegatee cancelled.'
    );
  }

  return tool;
};

export const handlePermitToolForDelegatee = async (
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
      (Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
        Object.keys(registeredTools.toolsWithoutPolicies).length === 0 &&
        Object.keys(registeredTools.toolsUnknownWithPolicies).length === 0)
    ) {
      throw new LawCliError(
        PermitToolForDelegateeErrors.NO_TOOLS_FOUND,
        'No tools found.'
      );
    }

    const delegatee = await promptSelectDelegateeToPermitToolFor(
      await admin.awAdmin.getDelegatees(pkp.info.tokenId)
    );

    const selectedTool = await promptSelectToolToPermit(
      registeredTools,
      await admin.awAdmin.getPermittedToolsForDelegatee(
        pkp.info.tokenId,
        delegatee
      )
    );

    await admin.awAdmin.permitToolForDelegatee(
      pkp.info.tokenId,
      selectedTool.ipfsCid,
      delegatee
    );
    logger.success(
      `${selectedTool.name} successfully permitted for delegatee ${delegatee}.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === PermitToolForDelegateeErrors.NO_TOOLS_FOUND ||
        error.type === PermitToolForDelegateeErrors.NO_DELEGATEES_FOUND ||
        error.type ===
          PermitToolForDelegateeErrors.PERMIT_TOOL_FOR_DELEGATEE_CANCELLED
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
