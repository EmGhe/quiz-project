/**
 * SPARQL Client for Wikidata Queries
 */

import axios, { AxiosError } from 'axios';
import { WIKIDATA_CONFIG } from './config';

/**
 * Execute a SPARQL query against Wikidata
 */
export async function executeSparqlQuery<T = any>(
  query: string,
  retries = 0
): Promise<T[]> {
  try {
    console.log('Executing SPARQL query...');
    console.log(query);

    const response = await axios.get(WIKIDATA_CONFIG.SPARQL_ENDPOINT, {
      params: {
        query,
        format: 'json',
      },
      headers: {
        'User-Agent': WIKIDATA_CONFIG.USER_AGENT,
        Accept: 'application/sparql-results+json',
      },
      timeout: WIKIDATA_CONFIG.REQUEST_TIMEOUT,
    });

    const results = response.data.results.bindings;
    console.log(`✓ Query successful, ${results.length} results returned`);

    return results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Retry on rate limit or server errors
      if (
        (axiosError.response?.status === 429 ||
          axiosError.response?.status === 503) &&
        retries < WIKIDATA_CONFIG.MAX_RETRIES
      ) {
        console.warn(
          `Rate limited or server error. Retrying in ${WIKIDATA_CONFIG.RETRY_DELAY}ms... (attempt ${retries + 1}/${WIKIDATA_CONFIG.MAX_RETRIES})`
        );

        await sleep(WIKIDATA_CONFIG.RETRY_DELAY);
        return executeSparqlQuery<T>(query, retries + 1);
      }

      console.error('SPARQL query failed:', axiosError.message);
      if (axiosError.response) {
        console.error('Status:', axiosError.response.status);
        console.error('Data:', axiosError.response.data);
      }
    } else {
      console.error('Unexpected error:', error);
    }

    throw error;
  }
}

/**
 * Extract value from SPARQL binding result
 */
export function extractValue(binding: any): string {
  if (!binding) return '';
  return binding.value || '';
}

/**
 * Extract Wikidata entity ID from URI
 * Example: http://www.wikidata.org/entity/Q90 -> Q90
 */
export function extractEntityId(uri: string): string {
  if (!uri) return '';
  const match = uri.match(/\/(Q\d+)$/);
  return match ? match[1] : '';
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate-limited query executor (respects WIKIDATA_CONFIG.REQUEST_DELAY)
 */
let lastRequestTime = 0;

export async function rateLimitedQuery<T = any>(
  query: string
): Promise<T[]> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < WIKIDATA_CONFIG.REQUEST_DELAY) {
    const delay = WIKIDATA_CONFIG.REQUEST_DELAY - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms...`);
    await sleep(delay);
  }

  lastRequestTime = Date.now();
  return executeSparqlQuery<T>(query);
}

/**
 * Parse SPARQL results into a more usable format
 */
export function parseResults<T = Record<string, any>>(
  results: any[],
  mapper?: (binding: any) => T
): T[] {
  if (mapper) {
    return results.map(mapper);
  }

  // Default: convert all bindings to simple key-value objects
  return results.map((binding) => {
    const obj: Record<string, any> = {};
    for (const key in binding) {
      obj[key] = extractValue(binding[key]);
    }
    return obj as T;
  });
}
