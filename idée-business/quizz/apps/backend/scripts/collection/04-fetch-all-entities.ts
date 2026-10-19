import { WikidataClient } from './utils/wikidata.client';
import { WikipediaClient } from './utils/wikipedia.client';
import { RarityService } from '../../src/modules/collection/services/rarity.service';
import * as fs from 'fs';
import * as path from 'path';

const rarityService = new RarityService();

interface TestEntity {
  wikidataId: string;
  expectedAlbum: string;
  comment: string;
}

async function main() {
  console.log('🚀 Fetching all 50 entities...\n');

  const testEntities: TestEntity[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities.json'),
      'utf-8'
    )
  );

  console.log(`Total entities to fetch: ${testEntities.length}\n`);

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < testEntities.length; i++) {
    const testEntity = testEntities[i];
    const entityNum = i + 1;

    console.log(`[${entityNum}/${testEntities.length}] Fetching ${testEntity.wikidataId} (${testEntity.comment})...`);

    try {
      // Fetch from APIs
      const entity = await WikidataClient.fetchEntity(testEntity.wikidataId);
      console.log(`  ✓ Label: ${entity.label}`);
      console.log(`  ✓ Wiki length: ${entity.wikiTextLength} chars`);

      // Fetch pageviews
      let pageviewsMonth: number | null = null; // null = unavailable, 0 = measured zero
      if (entity.wikipediaUrl) {
        const title = entity.wikipediaUrl.split('/').pop();
        try {
          pageviewsMonth = await WikipediaClient.fetchPageviews(title);
          console.log(`  ✓ Pageviews: ${pageviewsMonth.toLocaleString()}`);
        } catch (error) {
          console.warn(`  ⚠ Could not fetch pageviews: ${error.message}`);
          pageviewsMonth = null; // Data unavailable, not zero
        }
      } else {
        console.log(`  ⚠ No Wikipedia article - pageviews unavailable`);
        pageviewsMonth = null; // No Wikipedia = no pageview data available
      }

      // Fetch summary
      let description = entity.description;
      if (entity.wikipediaUrl) {
        const title = entity.wikipediaUrl.split('/').pop();
        try {
          description = await WikipediaClient.fetchSummary(title);
          console.log(`  ✓ Description: ${description.substring(0, 80)}...`);
        } catch (error) {
          console.warn(`  ⚠ Could not fetch summary, using Wikidata description`);
        }
      }

      // Calculate rarity
      const rarityScore = rarityService.calculateRarityScore(
        pageviewsMonth,
        entity.wikiTextLength
      );
      const rarity = rarityService.scoreToRarity(rarityScore);

      if (rarityScore === null || rarity === null) {
        console.log(`  ⚠ Rarity: INCOMPLETE DATA - cannot calculate rarity`);
      } else {
        console.log(`  ✓ Rarity score: ${rarityScore.toFixed(2)} → ${rarity}`);
      }

      results.push({
        wikidataId: testEntity.wikidataId,
        label: entity.label,
        type: entity.type,
        pageviewsMonth,
        wikiTextLength: entity.wikiTextLength,
        rarityScore,
        rarity,
        description,
        wikidataUrl: entity.wikidataUrl,
        wikipediaUrl: entity.wikipediaUrl,
        imageUrl: entity.imageUrl,
        expectedAlbum: testEntity.expectedAlbum,
      });

      successCount++;

      // Progress milestone every 10 entities
      if (entityNum % 10 === 0) {
        console.log(`\n📊 Progress: ${entityNum}/${testEntities.length} entities processed`);
        console.log(`   Success: ${successCount}, Errors: ${errorCount}\n`);
      }

      // Rate limit: wait 1.5s between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      errorCount++;
    }
  }

  // Save results
  const outputPath = path.join(__dirname, 'data/all-entities-fetched.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${results.length} entities to ${outputPath}`);
  console.log(`   Success: ${successCount}, Errors: ${errorCount}`);

  // Rarity distribution summary
  console.log('\n📊 Rarity distribution:');
  const rarityCounts = results.reduce((acc, e) => {
    acc[e.rarity] = (acc[e.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  rarities.forEach(r => {
    console.log(`   ${r}: ${rarityCounts[r] || 0}`);
  });

  // Check against target distribution
  console.log('\n🎯 Target distribution:');
  console.log('   common: 20, uncommon: 15, rare: 10, epic: 4, legendary: 1');

  const totalDiff = Math.abs((rarityCounts['common'] || 0) - 20) +
                    Math.abs((rarityCounts['uncommon'] || 0) - 15) +
                    Math.abs((rarityCounts['rare'] || 0) - 10) +
                    Math.abs((rarityCounts['epic'] || 0) - 4) +
                    Math.abs((rarityCounts['legendary'] || 0) - 1);

  if (totalDiff <= 10) {
    console.log('\n✅ Distribution is close to target (total diff: ' + totalDiff + ')');
  } else {
    console.log('\n⚠️  Distribution differs significantly from target (total diff: ' + totalDiff + ')');
    console.log('   This is expected due to algorithmic rarity calculation based on real data.');
  }
}

main()
  .catch(console.error);
