import type { PkpInfo } from '@lit-protocol/agent-wallet';
import { Admin } from '../admin';
import { logger } from '../../../core';

export const handleGetPolicies = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  const registeredTools =
    await admin.awAdmin.getRegisteredToolsAndDelegateesForPkp(pkp.info.tokenId);

  // Display tools with policies
  if (Object.keys(registeredTools.toolsWithPolicies).length > 0) {
    logger.info('Tools with policies:');
    Object.entries(registeredTools.toolsWithPolicies).forEach(
      ([ipfsCid, tool]) => {
        logger.log(tool.name);
        logger.log(`  IPFS CID: ${ipfsCid}`);
        if (
          tool.delegateePolicies &&
          Object.keys(tool.delegateePolicies).length > 0
        ) {
          logger.log('  Policies:');
          Object.entries(tool.delegateePolicies).forEach(
            ([delegatee, policy]) => {
              logger.log(`    Delegatee: ${delegatee}`);
              logger.log(`    Policy IPFS CID: ${policy.policyIpfsCid}`);
              logger.log(
                `    Status: ${policy.policyEnabled ? 'Enabled' : 'Disabled'}`
              );
            }
          );
        } else {
          logger.warn('  No policies configured');
        }
      }
    );
  }

  // Display tools without policies
  if (Object.keys(registeredTools.toolsWithoutPolicies).length > 0) {
    logger.info('Tools without policies:');
    Object.entries(registeredTools.toolsWithoutPolicies).forEach(
      ([ipfsCid, tool]) => {
        logger.log(`${tool.name}:`);
        logger.log(`  IPFS CID: ${ipfsCid}`);
      }
    );
  }

  // If no tools found at all
  if (
    Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
    Object.keys(registeredTools.toolsWithoutPolicies).length === 0
  ) {
    logger.info('No tools or policies found for this PKP.');
  }
};
