/**
 * POC Script: Test Wikidata Connection
 *
 * This script tests the Wikidata integration by fetching world capitals
 *
 * Usage: npx ts-node scripts/wikidata/test-connection.ts
 */

import { rateLimitedQuery, parseResults, extractEntityId } from './sparql-client';
import { QUERY_COUNTRIES_CAPITALS } from './queries';

interface CapitalResult {
  country: string;
  countryLabel: string;
  countryLabelEn: string;
  capital: string;
  capitalLabel: string;
  capitalLabelEn: string;
  continent?: string;
  continentLabel?: string;
  population?: string;
}

async function testWikidataConnection() {
  console.log('\n========================================');
  console.log('🧪 Testing Wikidata Connection');
  console.log('========================================\n');

  try {
    console.log('📡 Fetching countries and capitals from Wikidata...\n');

    const results = await rateLimitedQuery(QUERY_COUNTRIES_CAPITALS);

    console.log(`\n✅ Success! Retrieved ${results.length} results\n`);

    // Parse and display first 10 results
    const parsed = parseResults<CapitalResult>(results);

    console.log('📊 Sample Results (first 10):\n');
    console.log('─'.repeat(80));

    parsed.slice(0, 10).forEach((item, index) => {
      const countryId = extractEntityId(item.country);
      const capitalId = extractEntityId(item.capital);

      console.log(`${index + 1}. ${item.capitalLabel} (${capitalId})`);
      console.log(`   → Capitale de: ${item.countryLabel} (${countryId})`);
      console.log(`   → Continent: ${item.continentLabel || 'N/A'}`);
      console.log(`   → Population: ${item.population ? parseInt(item.population).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    console.log('─'.repeat(80));
    console.log(`\n📈 Total: ${parsed.length} country-capital pairs retrieved`);

    // Display some statistics
    const continentCounts = parsed.reduce((acc, item) => {
      const continent = item.continentLabel || 'Unknown';
      acc[continent] = (acc[continent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n🌍 Distribution by Continent:');
    Object.entries(continentCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([continent, count]) => {
        console.log(`   ${continent}: ${count}`);
      });

    console.log('\n✅ Test completed successfully!\n');

    return parsed;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  testWikidataConnection()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { testWikidataConnection };
