import { PrismaClient } from '@prisma/client';
import { RarityService } from '../../src/modules/collection/services/rarity.service';
import { WikidataClient } from './utils/wikidata.client';
import { WikipediaClient } from './utils/wikipedia.client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const rarityService = new RarityService();

interface VerifiedEntity {
  wikidataId: string;
  label: string;
  type: string;
  description: string;
  album: string;
  targetRarity: string;
  verified: boolean;
  note?: string;
}

interface VerifiedEntitiesFile {
  metadata: {
    version: string;
    lastUpdated: string;
    description: string;
    source: string;
  };
  entities: VerifiedEntity[];
}

/**
 * NEW APPROACH - No more rate limiting!
 *
 * Instead of querying Wikidata API hundreds of times:
 * 1. Read pre-verified QIDs from JSON file
 * 2. Fetch data from Wikidata ONLY for entities we know exist
 * 3. Much faster, no rate limiting, more reliable
 */
async function main() {
  console.log('🎯 Génération des entités depuis le fichier vérifié\n');

  // Load verified entities from JSON
  const dataPath = path.join(__dirname, 'data/verified-entities.json');
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  const data: VerifiedEntitiesFile = JSON.parse(fileContent);

  console.log(`📋 Fichier chargé: v${data.metadata.version}`);
  console.log(`   ${data.metadata.description}`);
  console.log(`   Dernière mise à jour: ${data.metadata.lastUpdated}\n`);

  const verifiedOnly = data.entities.filter(e => e.verified);
  const toVerify = data.entities.filter(e => !e.verified);

  console.log(`✅ Entités vérifiées: ${verifiedOnly.length}`);
  console.log(`⚠️  Entités à vérifier: ${toVerify.length}`);
  console.log(`📦 Total: ${data.entities.length}\n`);

  if (toVerify.length > 0) {
    console.log('⚠️  Les entités suivantes nécessitent une vérification manuelle:');
    toVerify.forEach(e => {
      console.log(`   - ${e.label} (${e.wikidataId})${e.note ? ` - ${e.note}` : ''}`);
    });
    console.log();
  }

  // Ask which entities to generate
  console.log('Choix:');
  console.log('  1. Générer SEULEMENT les entités vérifiées (' + verifiedOnly.length + ' entités)');
  console.log('  2. Générer TOUTES les entités (' + data.entities.length + ' entités, risque de QIDs incorrects)');
  console.log();

  // For now, generate only verified entities (safer)
  const entitiesToGenerate = verifiedOnly;

  console.log(`\n🚀 Génération de ${entitiesToGenerate.length} entités...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < entitiesToGenerate.length; i++) {
    const entityDef = entitiesToGenerate[i];
    const progress = `[${i + 1}/${entitiesToGenerate.length}]`;

    console.log(`${progress} ${entityDef.label} (${entityDef.wikidataId})`);

    // Check if entity already exists
    const existingEntity = await prisma.entity.findFirst({
      where: { wikidataId: entityDef.wikidataId },
    });

    if (existingEntity) {
      console.log(`  ⏭️  Already exists, skipping...\n`);
      successCount++;
      continue;
    }

    try {
      // Fetch REAL data from Wikidata
      const wikidataEntity = await WikidataClient.fetchEntity(entityDef.wikidataId);

      // Small delay between Wikidata and Wikipedia requests
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch pageviews from Wikipedia
      let pageviews: number | null = null;
      if (wikidataEntity.wikipediaUrl) {
        const title = decodeURIComponent(wikidataEntity.wikipediaUrl.split('/').pop() || '');
        pageviews = await WikipediaClient.fetchPageviews(title);
      }

      // Use wikiTextLength from Wikidata fetch
      const wikiTextLength = wikidataEntity.wikiTextLength;

      // Calculate rarity
      let rarityScore = rarityService.calculateRarityScore(pageviews, wikiTextLength);
      let rarity = rarityService.scoreToRarity(rarityScore);

      // Fallback for entities without Wikipedia (flags, logos, symbols)
      if (rarityScore === null || rarity === null) {
        console.log(`  ⚠️  No Wikipedia data (pageviews=${pageviews}, wikiLength=${wikiTextLength})`);
        console.log(`     → Using default rarity: common`);
        rarityScore = 25.0; // Default score for "common"
        rarity = 'common';
      } else {
        console.log(`  ✓ Rarity calculated: ${rarity} (score: ${rarityScore.toFixed(1)})`);
        console.log(`     Pageviews: ${pageviews?.toLocaleString() || 'N/A'}`);
        console.log(`     Wiki length: ${wikiTextLength?.toLocaleString() || 'N/A'}`);
      }

      // Create Entity in database
      const entity = await prisma.entity.create({
        data: {
          wikidataId: wikidataEntity.wikidataId,
          label: wikidataEntity.label,
          type: wikidataEntity.type,
          pageviewsMonth: pageviews || 0,
          wikiTextLength: wikiTextLength || 0,
          rarityScore: rarityScore,
          description: wikidataEntity.description,
          wikidataUrl: wikidataEntity.wikidataUrl,
          wikipediaUrl: wikidataEntity.wikipediaUrl,
        },
      });

      // Create Card
      const card = await prisma.card.create({
        data: {
          entityId: entity.id,
          rarity: rarity,
          imageUrl: '/images/collection/placeholder.jpg',
          imageWidth: 800,
          imageHeight: 600,
        },
      });

      // Link to album
      const album = await prisma.album.findFirst({
        where: { slug: entityDef.album },
      });

      if (album) {
        await prisma.cardAlbum.create({
          data: {
            cardId: card.id,
            albumId: album.id,
          },
        });
        console.log(`  ✅ Card created and linked to album "${entityDef.album}"`);
      } else {
        console.log(`  ⚠️  Album "${entityDef.album}" not found`);
      }

      successCount++;

      // Rate limiting: wait 3s between entities (avoid Wikidata rate limit)
      if (i < entitiesToGenerate.length - 1) {
        console.log(`  ⏱️  Waiting 3s before next entity...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log(`📊 Résumé:`);
  console.log(`   ✅ Succès: ${successCount}/${entitiesToGenerate.length}`);
  console.log(`   ❌ Erreurs: ${errorCount}/${entitiesToGenerate.length}`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
