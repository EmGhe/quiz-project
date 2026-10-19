/**
 * Shared HTTP configuration for collection scripts
 */

/**
 * User-Agent conforme to Wikimedia User-Agent policy
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */
export const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

/**
 * HTTP timeout configuration (milliseconds)
 */
export const HTTP_TIMEOUT = {
  DEFAULT: 10000, // 10 seconds
  LONG: 30000,    // 30 seconds for heavy queries
};

/**
 * Convert unknown error to message string
 * Handles TypeScript useUnknownInCatchVariables
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Check if error is an Axios HTTP error with status code
 */
export function getHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as any).response;
    if (response && typeof response.status === 'number') {
      return response.status;
    }
  }
  return null;
}
