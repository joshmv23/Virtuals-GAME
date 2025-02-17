import type { DelegatedPkpInfo } from '@lit-protocol/agent-wallet';
import prompts from 'prompts';

import { Delegatee } from './delegatee';
import { LawCliError, logger, DelegateeErrors } from '../../core';

/**
 * Prompts the user to enter their intent for finding a matching tool.
 */
const promptToolMatchingIntent = async (): Promise<string> => {
  const { intent } = await prompts({
    type: 'text',
    name: 'intent',
    message: 'Enter your intent:',
  });

  if (!intent) {
    throw new LawCliError(
      DelegateeErrors.GET_TOOL_VIA_INTENT_CANCELLED,
      'Intent input was cancelled'
    );
  }

  return intent;
};

/**
 * Handles the process of finding and displaying a tool that matches a user's intent.
 * This function prompts the user to enter their intent, finds a matching tool using
 * the intent matcher, and displays the results.
 */
export const handleGetToolViaIntent = async (
  delegatee: Delegatee,
  pkp: DelegatedPkpInfo
): Promise<void> => {
  try {
    // Prompt for the user's intent
    const intent = await promptToolMatchingIntent();

    // Find a tool matching the intent
    logger.info('Finding tool for intent...');
    const intentMatcherResponse = await delegatee.awDelegatee.getToolViaIntent(
      pkp.tokenId,
      intent,
      delegatee.intentMatcher!
    );

    // Handle case where no matching tool is found
    if (intentMatcherResponse.matchedTool === null) {
      logger.error('No matching tool found.');
      logger.log(`Reasoning: ${intentMatcherResponse.analysis.reasoning}`);
      return;
    }

    // Display the matching tool information
    logger.info('Found matching tool:');
    logger.log(
      `  - ${intentMatcherResponse.matchedTool.name} (${intentMatcherResponse.matchedTool.ipfsCid})`
    );
    logger.log(`      - ${intentMatcherResponse.matchedTool.description}`);
    logger.log(
      `      - Reasoning: ${intentMatcherResponse.analysis.reasoning}`
    );
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === DelegateeErrors.GET_TOOL_VIA_INTENT_CANCELLED) {
        logger.error('Intent input was cancelled');
        return;
      }
      if (error.type === DelegateeErrors.NO_DELEGATED_PKPS) {
        logger.error('No PKPs are currently delegated to you.');
        return;
      }
    }
    throw error;
  }
};
