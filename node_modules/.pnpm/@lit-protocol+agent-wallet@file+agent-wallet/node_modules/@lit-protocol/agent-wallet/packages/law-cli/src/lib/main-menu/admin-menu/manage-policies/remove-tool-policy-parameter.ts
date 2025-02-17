import prompts from 'prompts';
import type {
  PkpInfo,
  RegisteredToolsResult,
  RegisteredToolWithPolicies,
} from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import {
  LawCliError,
  logger,
  RemoveToolPolicyParameterErrors,
} from '../../../core';

const promptSelectToolForPolicyParameter = async (
  registeredTools: RegisteredToolsResult
): Promise<RegisteredToolWithPolicies> => {
  const choices = Object.values(registeredTools.toolsWithPolicies).map(
    (tool) => ({
      title: tool.name,
      description: `${Object.keys(tool.delegateePolicies).length} policies`,
      value: tool,
    })
  );

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to remove policy parameters from:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.REMOVE_CANCELLED,
      'Tool policy parameter removal cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegateeForPolicyParameter = async (
  delegatees: string[]
): Promise<string> => {
  if (delegatees.length === 0) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.NO_DELEGATEES,
      'No delegatees found.'
    );
  }

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to remove policy parameters from:',
    choices: delegatees.map((delegatee) => ({
      title: delegatee,
      value: delegatee,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.REMOVE_CANCELLED,
      'Tool policy parameter removal cancelled.'
    );
  }

  return delegatee;
};

const promptParametersToRemove = async (
  admin: Admin,
  pkp: PkpInfo,
  tool: RegisteredToolWithPolicies,
  delegatee: string
): Promise<string[]> => {
  const parameters = await admin.awAdmin.getAllToolPolicyParametersForDelegatee(
    pkp.info.tokenId,
    tool.ipfsCid,
    delegatee
  );

  if (!parameters || parameters.length === 0) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.NO_PARAMETERS,
      'No parameters found to remove.'
    );
  }

  const choices = parameters.map(
    (param: { name: string; value: Uint8Array }) => ({
      title: param.name,
      value: param.name,
    })
  );

  const { selectedParameters } = await prompts({
    type: 'multiselect',
    name: 'selectedParameters',
    message: 'Select parameters to remove (Space to select):',
    choices,
    min: 1,
    instructions: false,
  });

  if (!selectedParameters || selectedParameters.length === 0) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.REMOVE_CANCELLED,
      'Tool policy parameter removal cancelled.'
    );
  }

  return selectedParameters;
};

const removeToolPolicyParameters = async (
  admin: Admin,
  pkp: PkpInfo,
  tool: RegisteredToolWithPolicies,
  delegatee: string,
  parameterNames: string[]
): Promise<void> => {
  try {
    await admin.awAdmin.removeToolPolicyParametersForDelegatee(
      pkp.info.tokenId,
      tool.ipfsCid,
      delegatee,
      parameterNames
    );

    logger.success(
      `Successfully removed ${parameterNames.length} policy parameter(s) for tool ${tool.name} and delegatee ${delegatee}`
    );
  } catch (err: any) {
    throw new LawCliError(
      RemoveToolPolicyParameterErrors.FAILED,
      `Failed to remove tool policy parameters: ${err.message}`
    );
  }
};

export const handleRemoveToolPolicyParameter = async (
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
        RemoveToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES,
        'No tools with policies found.'
      );
    }

    const selectedTool = await promptSelectToolForPolicyParameter(
      registeredTools
    );
    const selectedDelegatee = await promptSelectDelegateeForPolicyParameter(
      selectedTool.delegatees
    );

    const parameterNames = await promptParametersToRemove(
      admin,
      pkp,
      selectedTool,
      selectedDelegatee
    );

    await removeToolPolicyParameters(
      admin,
      pkp,
      selectedTool,
      selectedDelegatee,
      parameterNames
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === RemoveToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES ||
        error.type === RemoveToolPolicyParameterErrors.NO_DELEGATEES ||
        error.type === RemoveToolPolicyParameterErrors.NO_PARAMETERS ||
        error.type === RemoveToolPolicyParameterErrors.REMOVE_CANCELLED ||
        error.type === RemoveToolPolicyParameterErrors.FAILED
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
