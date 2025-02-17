import { type DelegatedPkpInfo } from '@lit-protocol/agent-wallet';
import prompts from 'prompts';

import { Delegatee } from './delegatee';
import { LawCliError, logger, DelegateeErrors, LocalStorage } from '../../core';
import { getToolParams } from './get-tool-params';

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
 * Handles the process of executing a tool via intent.
 * This function first finds a matching tool based on the user's intent,
 * then prompts for any missing parameters, and executes the tool.
 */
export const handleExecuteToolViaIntent = async (
  localStorage: LocalStorage,
  delegatee: Delegatee,
  pkp: DelegatedPkpInfo
): Promise<void> => {
  try {
    // Check if intent matcher is configured
    if (!delegatee.intentMatcher) {
      logger.error('Intent matcher is not configured.');
      return;
    }

    // Get tool via intent
    logger.loading('Finding tool for intent...');
    const intent = await promptToolMatchingIntent();
    const intentMatcherResponse = await delegatee.awDelegatee.getToolViaIntent(
      pkp.tokenId,
      intent,
      delegatee.intentMatcher
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

    // Prompt for any missing parameters
    const params = await getToolParams(
      localStorage,
      intentMatcherResponse.matchedTool,
      pkp.ethAddress,
      {
        missingParams: intentMatcherResponse.params.missingParams,
        foundParams: intentMatcherResponse.params.foundParams,
      }
    );

    // Execute the tool
    logger.loading('Executing tool...');
    const response = await delegatee.awDelegatee.executeTool({
      ipfsId: intentMatcherResponse.matchedTool.ipfsCid,
      jsParams: {
        params,
      },
    });

    logger.info('Tool executed');
    logger.log(JSON.stringify(response, null, 2));
  } catch (error) {
    if (error instanceof LawCliError) {
      if (error.type === DelegateeErrors.GET_TOOL_VIA_INTENT_CANCELLED) {
        logger.error('Intent input was cancelled');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_PARAMS_CANCELLED) {
        logger.error('Tool parameter input cancelled');
        return;
      }
      if (error.type === DelegateeErrors.TOOL_PARAMS_INVALID) {
        logger.error(error.message);
        return;
      }
    }
    throw error;
  }
};
