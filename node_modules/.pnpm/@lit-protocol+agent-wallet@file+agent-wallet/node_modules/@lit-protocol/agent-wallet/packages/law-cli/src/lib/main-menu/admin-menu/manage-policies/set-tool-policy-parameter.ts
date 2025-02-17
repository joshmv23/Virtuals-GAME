import prompts from 'prompts';
import type {
  PkpInfo,
  RegisteredToolsResult,
  RegisteredToolWithPolicies,
} from '@lit-protocol/agent-wallet';
import { ethers } from 'ethers';

import { Admin } from '../admin';
import {
  LawCliError,
  logger,
  SetToolPolicyParameterErrors,
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
    message: 'Select a tool to set policy parameters for:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.SET_CANCELLED,
      'Tool policy parameter setting cancelled.'
    );
  }

  return tool;
};

const promptSelectDelegateeForPolicyParameter = async (
  delegatees: string[]
): Promise<string> => {
  if (delegatees.length === 0) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.NO_DELEGATEES,
      'No delegatees found.'
    );
  }

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a delegatee to set policy parameters for:',
    choices: delegatees.map((delegatee) => ({
      title: delegatee,
      value: delegatee,
    })),
  });

  if (!delegatee) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.SET_CANCELLED,
      'Tool policy parameter setting cancelled.'
    );
  }

  return delegatee;
};

const promptPolicyParameter = async (
  existingParameters: { name: string; value: Uint8Array }[]
): Promise<{ name: string; value: Uint8Array } | null> => {
  // Display existing parameters if any
  if (existingParameters.length > 0) {
    logger.info('Existing parameters:');
    for (const param of existingParameters) {
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

        logger.info(`${param.name}: ${displayValue}`);
      } catch {
        logger.info(`${param.name}: ${ethers.utils.hexlify(param.value)}`);
      }
    }
  }

  const { parameterName } = await prompts({
    type: 'text',
    name: 'parameterName',
    message: 'Enter parameter name (leave empty to finish):',
  });

  if (!parameterName) {
    return null;
  }

  // Check if parameter name already exists
  if (existingParameters.some((p) => p.name === parameterName)) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.PARAMETER_EXISTS,
      `Parameter "${parameterName}" already exists. Please remove it first if you want to update it.`
    );
  }

  const { parameterType } = await prompts({
    type: 'select',
    name: 'parameterType',
    message: 'Select parameter type:',
    choices: [
      { title: 'Number - Integer or Decimal', value: 'number' },
      { title: 'Address - Single Ethereum Address', value: 'address' },
      {
        title: 'Addresses - Array of Ethereum Addresses (Comma separated)',
        value: 'address[]',
      },
      { title: 'String - String Value', value: 'string' },
      {
        title: 'String[] - Array of Strings (Comma separated)',
        value: 'string[]',
      },
      { title: 'Boolean - True/False', value: 'boolean' },
    ],
  });

  if (!parameterType) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.SET_CANCELLED,
      'Tool policy parameter setting cancelled.'
    );
  }

  const { parameterValue } = await prompts({
    type: 'text',
    name: 'parameterValue',
    message: `Enter parameter value (${parameterType}):`,
  });

  if (!parameterValue) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.SET_CANCELLED,
      'Tool policy parameter setting cancelled.'
    );
  }

  try {
    let processedValue: any;
    let addresses: string[];
    switch (parameterType) {
      case 'number':
        processedValue = Number(parameterValue);
        if (isNaN(processedValue)) {
          throw new Error('Invalid number format');
        }
        break;
      case 'address':
        if (!ethers.utils.isAddress(parameterValue)) {
          throw new Error('Invalid Ethereum address format');
        }
        processedValue = parameterValue;
        break;
      case 'address[]':
        addresses = parameterValue
          .split(',')
          .map((addr: string) => addr.trim());
        if (!addresses.every((addr: string) => ethers.utils.isAddress(addr))) {
          throw new Error('Invalid Ethereum address format in array');
        }
        processedValue = addresses;
        break;
      case 'string':
        processedValue = parameterValue;
        break;
      case 'string[]':
        processedValue = parameterValue
          .split(',')
          .map((str: string) => str.trim());
        break;
      case 'boolean':
        if (
          parameterValue.toLowerCase() !== 'true' &&
          parameterValue.toLowerCase() !== 'false'
        ) {
          throw new Error('Invalid boolean value');
        }
        processedValue = parameterValue.toLowerCase() === 'true';
        break;
      default:
        throw new Error('Unsupported parameter type');
    }

    return {
      name: parameterName,
      value: Buffer.from(JSON.stringify(processedValue), 'utf8'),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new LawCliError(
        SetToolPolicyParameterErrors.FAILED,
        `Failed to process parameter value: ${err.message}`
      );
    }
    throw err;
  }
};

const setToolPolicyParameters = async (
  admin: Admin,
  pkp: PkpInfo,
  tool: RegisteredToolWithPolicies,
  delegatee: string
): Promise<void> => {
  // Get existing parameters from chain
  let existingParameters: { name: string; value: Uint8Array }[] = [];
  try {
    existingParameters =
      await admin.awAdmin.getAllToolPolicyParametersForDelegatee(
        pkp.info.tokenId,
        tool.ipfsCid,
        delegatee
      );
  } catch (err) {
    logger.warn('Failed to get existing parameters');
  }

  const parameterNames: string[] = [];
  const parameterValues: Uint8Array[] = [];

  while (true) {
    const parameter = await promptPolicyParameter(existingParameters);
    if (!parameter) {
      break;
    }
    parameterNames.push(parameter.name);
    parameterValues.push(parameter.value);
  }

  if (parameterNames.length === 0) {
    logger.info('No parameters to set.');
    return;
  }

  try {
    await admin.awAdmin.setToolPolicyParametersForDelegatee(
      pkp.info.tokenId,
      tool.ipfsCid,
      delegatee,
      parameterNames,
      parameterValues
    );

    logger.success(
      `Successfully set ${parameterNames.length} policy parameter(s) for tool ${tool.name} and delegatee ${delegatee}`
    );
  } catch (err: any) {
    throw new LawCliError(
      SetToolPolicyParameterErrors.FAILED,
      `Failed to set tool policy parameters: ${err.message}`
    );
  }
};

export const handleSetToolPolicyParameter = async (
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
        SetToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES,
        'No tools with policies found.'
      );
    }

    const selectedTool = await promptSelectToolForPolicyParameter(
      registeredTools
    );
    const selectedDelegatee = await promptSelectDelegateeForPolicyParameter(
      selectedTool.delegatees
    );

    await setToolPolicyParameters(admin, pkp, selectedTool, selectedDelegatee);
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === SetToolPolicyParameterErrors.NO_TOOLS_WITH_POLICIES ||
        error.type === SetToolPolicyParameterErrors.NO_DELEGATEES ||
        error.type === SetToolPolicyParameterErrors.SET_CANCELLED ||
        error.type === SetToolPolicyParameterErrors.PARAMETER_EXISTS ||
        error.type === SetToolPolicyParameterErrors.FAILED
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
