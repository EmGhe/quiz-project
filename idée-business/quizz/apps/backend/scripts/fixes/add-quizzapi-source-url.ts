/**
 * Migration Script: Add QuizzAPI Source URL
 *
 * Adds the source URL (https://quizzapi.fr) to the mediaSourceUrl field
 * for all questions imported from QuizzAPI.fr
 *
 * Usage: npx tsx scripts/fixes/add-quizzapi-source-url.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const QUIZZAPI_URL = 'https://quizzapi.fr';

async function main() {
  console.log('\n========================================');
  console.log('🔗 Adding QuizzAPI Source URL');
  console.log('========================================\n');

  // Get all questions from QuizzAPI
  const quizzapiQuestions = await prisma.question.findMany({
    where: {
      fact: {
        source: { name: 'QuizzAPI.fr' },
      },
    },
    include: {
      fact: true,
    },
  });

  console.log(`Found ${quizzapiQuestions.length} QuizzAPI questions\n`);

  let stats = {
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const question of quizzapiQuestions) {
    try {
      // Check if already has a source URL
      if (question.mediaSourceUrl) {
        console.log(`⏭️  Skipped (already has source): ${question.text.substring(0, 60)}...`);
        stats.skipped++;
        continue;
      }

      // Update with QuizzAPI URL
      await prisma.question.update({
        where: { id: question.id },
        data: {
          mediaSourceUrl: QUIZZAPI_URL,
        },
      });

      stats.updated++;

      if (stats.updated <= 10) {
        console.log(`✅ Updated: ${question.text.substring(0, 60)}...`);
      }
    } catch (error: any) {
      console.error(`❌ Error updating question ${question.id}: ${error.message}`);
      stats.errors++;
    }
  }

  console.log('\n========================================');
  console.log('📊 Update Summary');
  console.log('========================================');
  console.log(`Total questions:  ${quizzapiQuestions.length}`);
  console.log(`Updated:          ${stats.updated}`);
  console.log(`Skipped:          ${stats.skipped}`);
  console.log(`Errors:           ${stats.errors}`);
  console.log('========================================\n');

  // Verification
  console.log('🔍 Verification...\n');

  const verifyQuestions = await prisma.question.findMany({
    where: {
      fact: { source: { name: 'QuizzAPI.fr' } },
      mediaSourceUrl: QUIZZAPI_URL,
    },
  });

  console.log(`✅ ${verifyQuestions.length} questions now have mediaSourceUrl = "${QUIZZAPI_URL}"\n`);

  // Show samples
  const samples = await prisma.question.findMany({
    where: {
      fact: { source: { name: 'QuizzAPI.fr' } },
    },
    take: 3,
  });

  console.log('Sample of updated questions:\n');
  samples.forEach((q) => {
    console.log(`Question: ${q.text}`);
    console.log(`mediaSourceUrl: ${q.mediaSourceUrl || 'NULL'}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
