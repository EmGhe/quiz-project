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

// Mock data for reliable testing when APIs fail
const mockData = {
  'Q517': { label: 'Napoléon Bonaparte', pageviews: 180000, wikiLength: 45000, desc: 'Napoléon Bonaparte fut un militaire et homme d\'État français qui devint l\'Empereur des Français.' },
  'Q956': { label: 'Pékin', pageviews: 120000, wikiLength: 30000, desc: 'Pékin est la capitale de la République populaire de Chine depuis 1949.' },
  'Q12544': { label: 'La Joconde', pageviews: 95000, wikiLength: 25000, desc: 'La Joconde est un portrait peint par Léonard de Vinci au début du XVIe siècle.' },
  'Q3464665': { label: 'Intouchables', pageviews: 85000, wikiLength: 20000, desc: 'Intouchables est un film français réalisé par Olivier Nakache et Éric Toledano.' },
  'Q243': { label: 'Tour Eiffel', pageviews: 200000, wikiLength: 50000, desc: 'La Tour Eiffel est une tour métallique édifiée en 1889 à Paris.' },
  'Q142': { label: 'France', pageviews: 250000, wikiLength: 60000, desc: 'La France, officiellement République française, est un État d\'Europe occidentale.' },
  'Q1929607': { label: 'Drapeau français', pageviews: 45000, wikiLength: 15000, desc: 'Le drapeau de la France est le drapeau tricolore bleu, blanc, rouge.' },
  'Q188593': { label: 'Rayman', pageviews: 30000, wikiLength: 10000, desc: 'Rayman est une franchise de jeux vidéo créée par Ubisoft.' },
  'Q10305': { label: 'Zinédine Zidane', pageviews: 150000, wikiLength: 35000, desc: 'Zinédine Yazid Zidane, dit Zidane, est un ancien joueur de football français.' },
  'Q7374': { label: 'Victor Hugo', pageviews: 140000, wikiLength: 40000, desc: 'Victor Hugo est un poète, dramaturge et romancier français du XIXe siècle.' },
};

async function main() {
  console.log('Fetching 10 test entities...\n');

  const testEntities: TestEntity[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities.json'),
      'utf-8'
    )
  );

  const results = [];

  for (const testEntity of testEntities) {
    console.log(`\nFetching ${testEntity.wikidataId} (${testEntity.comment})...`);

    try {
      // Try to fetch from APIs
      let entity = null;
      let pageviewsMonth: number | null = null; // null = unavailable, 0 = measured zero
      let description = '';

      try {
        entity = await WikidataClient.fetchEntity(testEntity.wikidataId);
        console.log(`  Label: ${entity.label}`);
        console.log(`  Wiki length: ${entity.wikiTextLength} chars`);

        // Fetch pageviews
        if (entity.wikipediaUrl) {
          const title = entity.wikipediaUrl.split('/').pop();
          try {
            pageviewsMonth = await WikipediaClient.fetchPageviews(title);
            console.log(`  Pageviews: ${pageviewsMonth.toLocaleString()}`);
          } catch (error) {
            console.warn(`  Could not fetch pageviews: ${error.message}`);
            pageviewsMonth = null; // Data unavailable, not zero
          }
        } else {
          console.log(`  Pageviews: N/A (no Wikipedia article)`);
          pageviewsMonth = null; // No Wikipedia = no pageview data available
        }

        // Fetch summary
        description = entity.description;
        if (entity.wikipediaUrl) {
          const title = entity.wikipediaUrl.split('/').pop();
          try {
            description = await WikipediaClient.fetchSummary(title);
            console.log(`  Description: ${description.substring(0, 100)}...`);
          } catch (error) {
            console.warn(`  Could not fetch summary, using Wikidata description`);
          }
        }
      } catch (error) {
        // Fallback to mock data
        console.warn(`  Using mock data: ${error.message}`);
        const mock = mockData[testEntity.wikidataId];
        if (mock) {
          entity = {
            wikidataId: testEntity.wikidataId,
            label: mock.label,
            type: 'entity',
            description: mock.desc,
            wikipediaUrl: null,
            wikidataUrl: `https://www.wikidata.org/wiki/${testEntity.wikidataId}`,
            imageUrl: null,
            wikiTextLength: mock.wikiLength,
          };
          pageviewsMonth = mock.pageviews;
          description = mock.desc;
          console.log(`  Label: ${entity.label} (mock)`);
          console.log(`  Wiki length: ${entity.wikiTextLength} chars (mock)`);
          console.log(`  Pageviews: ${pageviewsMonth.toLocaleString()} (mock)`);
        } else {
          throw new Error(`No mock data for ${testEntity.wikidataId}`);
        }
      }

      // Calculate rarity
      const rarityScore = rarityService.calculateRarityScore(
        pageviewsMonth,
        entity.wikiTextLength
      );
      const rarity = rarityService.scoreToRarity(rarityScore);

      if (rarityScore === null || rarity === null) {
        console.log(`  Rarity: INCOMPLETE DATA - cannot calculate rarity`);
      } else {
        console.log(`  Rarity score: ${rarityScore.toFixed(2)} → ${rarity}`);
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

      // Rate limit: wait 1.5s between requests (even for mock data for consistency)
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, 'data/test-entities-fetched.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${results.length} entities to ${outputPath}`);

  // Summary
  console.log('\n📊 Rarity distribution:');
  const rarityCounts = results.reduce((acc, e) => {
    acc[e.rarity] = (acc[e.rarity] || 0) + 1;
    return acc;
  }, {});
  console.log(rarityCounts);
}

main()
  .catch(console.error);
