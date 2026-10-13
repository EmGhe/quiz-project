/**
 * Ingestion Script: World Capitals
 *
 * Fetches countries and capitals from Wikidata and stores them as Facts
 *
 * Usage: npx ts-node scripts/ingest/capitals.ts
 */

import { rateLimitedQuery, parseResults, extractEntityId } from '../wikidata/sparql-client';
import { QUERY_COUNTRIES_CAPITALS } from '../wikidata/queries';
import {
  getPrismaClient,
  closePrismaConnection,
  ensureCategoriesExist,
  ensureWikidataSource,
  getCategoryBySlug,
} from '../utils/db';
import {
  mapContinentToRegion,
  calculateInterestScore,
  getCapitalTags,
} from '../utils/geo-mapper';

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

async function ingestCapitals() {
  console.log('\n========================================');
  console.log('📥 Ingesting World Capitals from Wikidata');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Ensure categories and source exist
    console.log('Step 1: Setting up database...');
    await ensureCategoriesExist();
    const wikidataSource = await ensureWikidataSource();
    const geoCategory = await getCategoryBySlug('geographie');

    if (!geoCategory) {
      throw new Error('Geography category not found');
    }

    console.log('✓ Database setup complete\n');

    // Step 2: Fetch data from Wikidata
    console.log('Step 2: Fetching data from Wikidata...');
    const results = await rateLimitedQuery(QUERY_COUNTRIES_CAPITALS);
    const parsed = parseResults<CapitalResult>(results);

    console.log(`✓ Retrieved ${parsed.length} country-capital pairs\n`);

    // Step 3: Remove duplicates (some countries appear multiple times with different continents)
    const uniqueMap = new Map<string, CapitalResult>();
    parsed.forEach((item) => {
      const key = `${item.country}-${item.capital}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const uniquePairs = Array.from(uniqueMap.values());
    console.log(`✓ After deduplication: ${uniquePairs.length} unique pairs\n`);

    // Step 4: Insert facts into database
    console.log('Step 3: Inserting facts into database...');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of uniquePairs) {
      const countryId = extractEntityId(item.country);
      const capitalId = extractEntityId(item.capital);
      const population = item.population ? parseInt(item.population) : undefined;

      // Map continent to region
      const region = mapContinentToRegion(item.continentLabel, item.countryLabel);

      // Calculate interest score
      const interestScore = calculateInterestScore(
        population,
        region,
        item.countryLabel
      );

      // Get tags
      const tags = getCapitalTags(
        item.countryLabel,
        item.capitalLabel,
        item.continentLabel
      );

      // Additional data
      const data = {
        countryEntityId: countryId,
        capitalEntityId: capitalId,
        countryNameFr: item.countryLabel,
        countryNameEn: item.countryLabelEn,
        capitalNameEn: item.capitalLabelEn,
        continent: item.continentLabel,
        population,
      };

      try {
        // Try to upsert the fact
        await prisma.fact.upsert({
          where: {
            subject_property_object: {
              subject: item.capitalLabel,
              property: 'est la capitale de',
              object: item.countryLabel,
            },
          },
          update: {
            lastVerification: new Date(),
            data,
            interestScore,
            tags,
            geoRegion: region,
          },
          create: {
            subject: item.capitalLabel,
            property: 'est la capitale de',
            object: item.countryLabel,
            sourceId: wikidataSource.id,
            sourceReference: capitalId,
            categoryId: geoCategory.id,
            geoRegion: region,
            tags,
            data,
            interestScore,
            active: true,
            createdBy: 'wikidata-ingestion',
          },
        });

        // Check if it was an insert or update
        const existing = await prisma.fact.findUnique({
          where: {
            subject_property_object: {
              subject: item.capitalLabel,
              property: 'est la capitale de',
              object: item.countryLabel,
            },
          },
        });

        if (existing) {
          // Check if created recently (within 1 second)
          const isNew =
            new Date().getTime() - new Date(existing.createdAt).getTime() < 1000;
          if (isNew) {
            inserted++;
          } else {
            updated++;
          }
        }

        if ((inserted + updated) % 50 === 0) {
          console.log(`  Progress: ${inserted + updated}/${uniquePairs.length}`);
        }
      } catch (error) {
        console.error(
          `  ⚠️  Error inserting ${item.capitalLabel} -> ${item.countryLabel}:`,
          error
        );
        skipped++;
      }
    }

    console.log('\n✅ Ingestion complete!\n');

    // Step 5: Display statistics
    console.log('📊 Statistics:');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${uniquePairs.length}\n`);

    // Count by region
    const regionCounts = await prisma.fact.groupBy({
      by: ['geoRegion'],
      where: {
        property: 'est la capitale de',
      },
      _count: true,
    });

    console.log('🌍 Distribution by Region:');
    regionCounts.forEach((item) => {
      const percentage = ((item._count / uniquePairs.length) * 100).toFixed(1);
      console.log(`   ${item.geoRegion}: ${item._count} (${percentage}%)`);
    });

    // Count by category
    const totalFacts = await prisma.fact.count();
    console.log(`\n📚 Total facts in database: ${totalFacts}`);

    return {
      inserted,
      updated,
      skipped,
      total: uniquePairs.length,
    };
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  ingestCapitals()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { ingestCapitals };
