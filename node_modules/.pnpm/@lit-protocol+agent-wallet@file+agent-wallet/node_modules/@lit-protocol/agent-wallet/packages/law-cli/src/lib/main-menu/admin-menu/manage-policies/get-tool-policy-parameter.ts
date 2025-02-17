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
  GetToolPolicyParameterErrors,
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
    message: 'Select a tool to view policy parameters for:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      GetToolPolicyParameterErrors.GET_CANCELLED,
      'Tool policy parameter viewing cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegateeForPolicyParameter = async (
  delegatees: string[]
): Promise<string> => {
  if (delegatees.length === 0) {
    throw new LawCliError(
      GetToolPolicyParameterErrors.NO_DELEGATEES,
      'No delegatees found.'
    );
  }

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to view policy parameters for:',
    choices: delegatees.map((delegatee) => ({
      title: delegatee,
      value: delegatee,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      GetToolPolicyParameterErrors.GET_CANCELLED,
      'Tool policy parameter viewing cancelled.'
    );
  }

  return delegatee;
};

const displayToolPolicyParameters = async (
  admin: Admin,
  pkp: PkpInfo,
  tool: RegisteredToolWithPolicies,
  delegatee: string
): Promise<void> => {
  const parameters = await admin.awAdmin.getAllToolPolicyParametersForDelegatee(
    pkp.info.tokenId,
    tool.ipfsCid,
    delegatee
  );

  if (!parameters || parameters.length === 0) {
    throw new LawCliError(
      GetToolPolicyParameterErrors.NO_PARAMETERS,
      'No policy parameters found.'
    );
  }

  logger.info(`Policy parameters for tool ${tool.name}:`);
  logger.log(`  Tool IPFS CID: ${tool.ipfsCid}`);
  logger.log(`  Delegatee: ${delegatee}`);
  logger.log('  Parameters:');

  for (const param of parameters) {
    try {
      const value = Buffer.from(param.value).toString('utf8');
      let displayValue: string;

      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          const parsed = JSON.parse(value);
          displayValue = JSON.stringify(parsed, null, 2);
        } catch {
          displayValue = value;
        }
      } else {
        displayValue = value;
      }

      logger.log(`    ${param.name}: ${displayValue}`);
    } catch {
      logger.log(`    ${param.name}: ${param.value}`);
    }
  }
};

export const handleGetToolPolicyParameter = async (
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
        GetToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES,
        'No tools with policies found.'
      );
    }

    const selectedTool = await promptSelectToolForPolicyParameter(
      registeredTools
    );
    const selectedDelegatee = await promptSelectDelegateeForPolicyParameter(
      selectedTool.delegatees
    );

    await displayToolPolicyParameters(
      admin,
      pkp,
      selectedTool,
      selectedDelegatee
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === GetToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES ||
        error.type === GetToolPolicyParameterErrors.NO_DELEGATEES ||
        error.type === GetToolPolicyParameterErrors.NO_PARAMETERS ||
        error.type === GetToolPolicyParameterErrors.GET_CANCELLED
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
