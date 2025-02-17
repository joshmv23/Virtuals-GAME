import type { LawCliErrorType } from './errors';

type ErrorDetails = {
  name?: string;
  message?: string;
  stack?: string;
  type?: LawCliErrorType;
  details?: unknown;
  [key: string]: unknown;
};

export class LawCliError extends Error {
  public readonly serializedDetails: string;

  constructor(
    public readonly type: LawCliErrorType,
    message: string,
    public readonly details?: Record<string, ErrorDetails | unknown>
  ) {
    super(message);
    this.name = 'AwCliError';

    // Store a serialized version of details for better error logging
    this.serializedDetails = details
      ? JSON.stringify(
          details,
          (key, value) => {
            if (value instanceof Error) {
              // Handle nested errors
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
                ...(value instanceof LawCliError
                  ? {
                      type: value.type,
                      details: value.serializedDetails
                        ? JSON.parse(value.serializedDetails)
                        : undefined,
                    }
                  : {}),
              };
            }
            return value;
          },
          2
        )
      : '';
  }

  // Override toJSON to provide better serialization
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      details: this.serializedDetails
        ? JSON.parse(this.serializedDetails)
        : undefined,
      stack: this.stack,
    };
  }
}
