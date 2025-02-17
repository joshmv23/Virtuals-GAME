import type { DelegatedPkpInfo } from '@lit-protocol/agent-wallet';

import { Delegatee } from './delegatee';
import { LawCliError, logger, DelegateeErrors } from '../../core';

export const handleGetRegisteredTools = async (
  delegatee: Delegatee,
  pkp: DelegatedPkpInfo
): Promise<void> => {
  try {
    const registeredTools = await delegatee.awDelegatee.getPermittedToolsForPkp(
      pkp.tokenId
    );

    // Process tools with policies
    if (Object.keys(registeredTools.toolsWithPolicies).length > 0) {
      logger.info('Tools with Policies:');
      Object.values(registeredTools.toolsWithPolicies).forEach((tool) => {
        logger.log(`  - ${tool.name} (${tool.ipfsCid})`);
        logger.log(`      - Tool Enabled: ${tool.toolEnabled ? '✅' : '❌'}`);
        logger.log(`      - Description: ${tool.description}`);
        logger.log(`      - Policy IPFS CID: ${tool.policyIpfsCid}`);
        logger.log(
          `      - Policy Enabled: ${tool.policyEnabled ? '✅' : '❌'}`
        );
      });
    }

    // Process tools without policies
    if (Object.keys(registeredTools.toolsWithoutPolicies).length > 0) {
      logger.info('Tools without Policies:');
      Object.values(registeredTools.toolsWithoutPolicies).forEach((tool) => {
        logger.log(`  - ${tool.name} (${tool.ipfsCid})`);
        logger.log(`      - Tool Enabled: ${tool.toolEnabled ? '✅' : '❌'}`);
        logger.log(`      - Description: ${tool.description}`);
      });
    }

    // Process unknown tools with policies
    if (Object.keys(registeredTools.toolsUnknownWithPolicies).length > 0) {
      logger.info('Unknown Tools with Policies:');
      Object.entries(registeredTools.toolsUnknownWithPolicies).forEach(
        ([ipfsCid, tool]) => {
          logger.log(`  - Unknown tool: ${ipfsCid}`);
          logger.log(`      - Tool Enabled: ${tool.toolEnabled ? '✅' : '❌'}`);
          logger.log(`      - Policy IPFS CID: ${tool.policyIpfsCid}`);
          logger.log(
            `      - Policy Enabled: ${tool.policyEnabled ? '✅' : '❌'}`
          );
        }
      );
    }

    // Process unknown tools without policies
    if (registeredTools.toolsUnknownWithoutPolicies.length > 0) {
      logger.info('Unknown Tools without Policies:');
      registeredTools.toolsUnknownWithoutPolicies.forEach((ipfsCid) => {
        logger.log(`  - Unknown tool: ${ipfsCid}`);
      });
    }

    // If no tools found at all
    if (
      Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
      Object.keys(registeredTools.toolsWithoutPolicies).length === 0 &&
      Object.keys(registeredTools.toolsUnknownWithPolicies).length === 0 &&
      registeredTools.toolsUnknownWithoutPolicies.length === 0
    ) {
      logger.info('No tools are registered for this PKP.');
    }
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === DelegateeErrors.NO_DELEGATED_PKPS) {
        logger.error('No PKPs are currently delegated to you.');
        return;
      }
    }
    throw error;
  }
};
