import prompts from 'prompts';
import {
  PkpInfo,
  RegisteredToolsResult,
  ToolMetadata,
  RegisteredToolWithPolicies,
} from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { LawCliError, logger, SetPolicyErrors } from '../../../core';

const promptSelectToolForPolicy = async (
  registeredTools: RegisteredToolsResult
) => {
  // Combine tools with and without policies into a single list of choices
  const choices = [
    // TODO You have to remove a policy before being able to set a new one
    // this should do that for the user when selected
    // ...Object.values(registeredTools.toolsWithPolicies).map((tool) => ({
    //   title: tool.name,
    //   description: 'Update existing policy',
    //   value: tool,
    // })),
    ...Object.values(registeredTools.toolsWithoutPolicies).map((tool) => ({
      title: tool.name,
      //   description: 'Set new policy',
      value: tool,
    })),
  ];

  if (choices.length === 0) {
    throw new LawCliError(
      SetPolicyErrors.NO_TOOLS_FOUND,
      'No tools found to set policy for.'
    );
  }

  const { tool } = await prompts({
    type: 'select',
    name: 'tool',
    message: 'Select a tool to set policy for:',
    choices,
  });

  if (!tool) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'Tool selection cancelled.'
    );
  }

  return tool as RegisteredToolWithPolicies | ToolMetadata;
};

const promptSelectToolDelegateeForPolicy = async (
  admin: Admin,
  pkp: PkpInfo,
  selectedTool: RegisteredToolWithPolicies | ToolMetadata
) => {
  // Get all PKP delegatees
  const pkpDelegatees = await admin.awAdmin.getDelegatees(pkp.info.tokenId);

  if (pkpDelegatees.length === 0) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'No Delegatees found.'
    );
  }

  // Filter delegatees to only those that have the tool permitted but no policy set
  const delegateesWithoutPolicy = [];
  for (const delegatee of pkpDelegatees) {
    const delegateePermittedTools =
      await admin.awAdmin.getPermittedToolsForDelegatee(
        pkp.info.tokenId,
        delegatee
      );

    if (
      delegateePermittedTools.some(
        (tool) => tool.toolIpfsCid === selectedTool.ipfsCid
      ) &&
      !(
        'delegateePolicies' in selectedTool &&
        delegatee in selectedTool.delegateePolicies
      )
    ) {
      delegateesWithoutPolicy.push(delegatee);
    }
  }

  if (delegateesWithoutPolicy.length === 0) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'No Delegatees found without existing policy for this tool.'
    );
  }

  const choices = delegateesWithoutPolicy.map((delegatee) => ({
    title: delegatee,
    value: delegatee,
  }));

  const { delegatee } = await prompts({
    type: 'select',
    name: 'delegatee',
    message: 'Select a Delegatee to set policy for:',
    choices,
  });

  if (!delegatee) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'Delegatee selection cancelled.'
    );
  }

  return delegatee;
};

const promptPolicyDetails = async () => {
  const { policyIpfsCid } = await prompts({
    type: 'text',
    name: 'policyIpfsCid',
    message: 'Enter the IPFS CID of the policy:',
    validate: (value) => !!value || 'Policy IPFS CID is required',
  });

  if (!policyIpfsCid) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'No policy IPFS CID provided. Operation cancelled.'
    );
  }

  const { enablePolicy } = await prompts({
    type: 'confirm',
    name: 'enablePolicy',
    message: 'Enable policy after setting?',
    initial: true,
  });

  if (enablePolicy === undefined) {
    throw new LawCliError(
      SetPolicyErrors.SET_POLICY_CANCELLED,
      'Enable policy selection cancelled.'
    );
  }

  return { policyIpfsCid, enablePolicy };
};

export const handleSetPolicy = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  try {
    const registeredTools =
      await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(
        pkp.info.tokenId
      );

    if (
      Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
      Object.keys(registeredTools.toolsWithoutPolicies).length === 0
    ) {
      throw new LawCliError(
        SetPolicyErrors.NO_TOOLS_FOUND,
        'No tools are currently permitted.'
      );
    }

    // Select tool for setting or updating policy
    const selectedTool = await promptSelectToolForPolicy(registeredTools);
    const selectedDelegatee = await promptSelectToolDelegateeForPolicy(
      admin,
      pkp,
      selectedTool
    );
    const { policyIpfsCid, enablePolicy } = await promptPolicyDetails();

    await admin.awAdmin.setToolPolicyForDelegatee(
      pkp.info.tokenId,
      selectedTool.ipfsCid,
      selectedDelegatee,
      policyIpfsCid,
      enablePolicy
    );

    logger.success(
      `Policy set successfully for tool ${selectedTool.name}${
        enablePolicy ? ' and enabled' : ''
      }.`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (
        error.type === SetPolicyErrors.SET_POLICY_CANCELLED ||
        error.type === SetPolicyErrors.NO_TOOLS_FOUND
      ) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
