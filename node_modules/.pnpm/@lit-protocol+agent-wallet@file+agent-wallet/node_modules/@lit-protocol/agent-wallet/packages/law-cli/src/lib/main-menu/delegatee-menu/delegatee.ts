import {
  Delegatee as AwDelegatee,
  AwSignerError,
  AwSignerErrorType,
  LitNetwork,
  type IntentMatcher,
} from '@lit-protocol/agent-wallet';

import { logger } from '../../core';
import { promptDelegateeInsufficientBalance } from './insuffcient-balance';

export class Delegatee {
  public awDelegatee: AwDelegatee;
  public intentMatcher: IntentMatcher | null = null;
  /**
   * Private constructor for the Delegatee class.
   * @param awDelegatee - An instance of the `AwDelegatee` class.
   */
  private constructor(awDelegatee: AwDelegatee) {
    this.awDelegatee = awDelegatee;
  }

  /**
   * Creates an instance of the `AwDelegatee` class.
   * Handles errors related to missing private keys or insufficient balances by prompting the user for input.
   *
   * @param litNetwork - The Lit network to use for the Delegatee role.
   * @param privateKey - Optional. The private key for the Delegatee role.
   * @returns A promise that resolves to an instance of the `AwDelegatee` class.
   * @throws If initialization fails, the function logs an error and exits the process.
   */
  private static async createAwDelegatee(
    litNetwork: LitNetwork,
    privateKey: string
  ): Promise<AwDelegatee> {
    let awDelegatee: AwDelegatee;
    try {
      // Attempt to create the AwDelegatee instance.
      awDelegatee = await AwDelegatee.create(privateKey, { litNetwork });
    } catch (error) {
      // Handle specific errors related to missing private keys or insufficient balances.
      if (error instanceof AwSignerError) {
        // TODO: This shouldn't happen as handleUseEoa should ensure a private key is provided
        // if (error.type === AwSignerErrorType.DELEGATEE_MISSING_PRIVATE_KEY) {
        // Prompt the user for a private key if it is missing.
        //   const privateKey = await promptDelegateeInit();
        //   return Delegatee.createAwDelegatee(litNetwork, privateKey);
        // }

        if (
          error.type ===
          AwSignerErrorType.INSUFFICIENT_BALANCE_CAPACITY_CREDIT_MINT
        ) {
          // Prompt the user to fund the account if the balance is insufficient.
          const hasFunded = await promptDelegateeInsufficientBalance();
          if (hasFunded) {
            return Delegatee.createAwDelegatee(litNetwork, privateKey);
          }
        }
      }

      // Log any other errors and exit the process.
      logger.error('Failed to initialize Delegatee role', error as Error);
      throw error;
    }

    return awDelegatee;
  }

  public static async create(
    litNetwork: LitNetwork,
    privateKey: string,
    intentMatcher?: IntentMatcher
  ) {
    const awDelegatee = await Delegatee.createAwDelegatee(
      litNetwork,
      privateKey
    );
    const delegatee = new Delegatee(awDelegatee);
    delegatee.intentMatcher = intentMatcher ?? null;
    return delegatee;
  }

  public setIntentMatcher(intentMatcher: IntentMatcher) {
    this.intentMatcher = intentMatcher;
  }

  public disconnect() {
    this.awDelegatee.disconnect();
  }
}
