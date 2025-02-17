import prompts from 'prompts';
import { OpenAiIntentMatcher } from '@lit-protocol/agent-wallet';

import { LawCliError, DelegateeErrors } from '../../core';
import { Delegatee } from './delegatee';

const promptGetOpenAiApiKey = async (): Promise<string> => {
  const { apiKey } = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your OpenAI API key:',
  });

  if (!apiKey) {
    throw new LawCliError(
      DelegateeErrors.GET_INTENT_MATCHER_CANCELLED,
      'OpenAI API key input cancelled'
    );
  }

  return apiKey;
};

export const handleGetIntentMatcher = async (
  delegatee: Delegatee
): Promise<OpenAiIntentMatcher> => {
  const { foundCredentials, missingCredentials } =
    await delegatee.awDelegatee.getCredentials<typeof OpenAiIntentMatcher>(
      OpenAiIntentMatcher.requiredCredentialNames
    );

  // TODO This shouldn't assume that the OpenAI API key is the only credential
  if (missingCredentials.length > 0) {
    const apiKey = await promptGetOpenAiApiKey();
    await delegatee.awDelegatee.setCredentials<typeof OpenAiIntentMatcher>({
      openAiApiKey: apiKey,
    });
    return new OpenAiIntentMatcher(apiKey);
  }

  return new OpenAiIntentMatcher(foundCredentials.openAiApiKey!);
};
