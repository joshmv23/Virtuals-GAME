import type { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { logger } from '../../../core';

export const handleGetTools = async (
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
        logger.log(`  Description: ${tool.description}`);
        logger.log(`  Status: ${tool.toolEnabled ? 'Enabled' : 'Disabled'}`);
        logger.log(`  Network: ${tool.network}`);
        if (tool.delegatees.length > 0) {
          logger.log('  Delegatees:');
          tool.delegatees.forEach((delegatee) => {
            logger.log(`    - ${delegatee}`);
          });
        }
      }
    );
  }

  // Display tools without policies
  if (Object.keys(registeredTools.toolsWithoutPolicies).length > 0) {
    logger.info('Tools without policies:');
    Object.entries(registeredTools.toolsWithoutPolicies).forEach(
      ([ipfsCid, tool]) => {
        logger.log(tool.name);
        logger.log(`  IPFS CID: ${ipfsCid}`);
        logger.log(`  Description: ${tool.description}`);
        logger.log(`  Status: ${tool.toolEnabled ? 'Enabled' : 'Disabled'}`);
        logger.log(`  Network: ${tool.network}`);
        if (tool.delegatees.length > 0) {
          logger.info('  Delegatees:');
          tool.delegatees.forEach((delegatee) => {
            logger.info(`    - ${delegatee}`);
          });
        }
      }
    );
  }

  // Display unknown tools with policies
  if (Object.keys(registeredTools.toolsUnknownWithPolicies).length > 0) {
    logger.info('Unknown tools with policies:');
    Object.entries(registeredTools.toolsUnknownWithPolicies).forEach(
      ([ipfsCid, tool]) => {
        logger.log(`IPFS CID: ${ipfsCid}`);
        if (tool.delegatees.length > 0) {
          logger.log('  Delegatees:');
          tool.delegatees.forEach((delegatee) => {
            logger.info(`    - ${delegatee}`);
          });
        }
      }
    );
  }

  // Display unknown tools without policies
  if (registeredTools.toolsUnknownWithoutPolicies.length > 0) {
    logger.info('Unknown tools without policies:');
    registeredTools.toolsUnknownWithoutPolicies.forEach((ipfsCid) => {
      logger.log(`  - ${ipfsCid}`);
    });
  }

  // If no tools found at all
  if (
    Object.keys(registeredTools.toolsWithPolicies).length === 0 &&
    Object.keys(registeredTools.toolsWithoutPolicies).length === 0 &&
    Object.keys(registeredTools.toolsUnknownWithPolicies).length === 0 &&
    registeredTools.toolsUnknownWithoutPolicies.length === 0
  ) {
    logger.info('No tools found for this PKP.');
  }
};
