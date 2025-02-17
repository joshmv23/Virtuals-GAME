import type { PkpInfo } from '@lit-protocol/agent-wallet';

import { Admin } from '../admin';
import { logger } from '../../../core';

export const handleGetDelegatees = async (
  admin: Admin,
  pkp: PkpInfo
): Promise<void> => {
  const delegatees = await admin.awAdmin.getDelegatees(pkp.info.tokenId);

  if (delegatees.length === 0) {
    logger.info('No delegatees found.');
    return;
  }

  logger.info('Current Delegatees:');
  delegatees.forEach((address) => {
    logger.log(`  - ${address}`);
  });
};
