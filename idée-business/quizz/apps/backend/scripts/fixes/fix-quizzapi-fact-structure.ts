/**
 * Migration Script: Fix QuizzAPI Fact Structure
 *
 * Corrects the inverted subject/object structure in QuizzAPI facts
 *
 * BEFORE (incorrect):
 *   subject: "Qui a joué en premier le rôle de James Bond ?"
 *   property: "réponse"
 *   object: "Sean Connery"
 *
 * AFTER (correct):
 *   subject: "Sean Connery"
 *   property: "description"
 *   object: "Qui a joué en premier le rôle de James Bond ?"
 *
 * Usage: npx tsx scripts/fixes/fix-quizzapi-fact-structure.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('🔧 Fixing QuizzAPI Fact Structure');
  console.log('========================================\n');

  // Get all QuizzAPI facts
  const quizzapiFacts = await prisma.fact.findMany({
    where: {
      source: { name: 'QuizzAPI.fr' },
    },
    include: {
      questions: true,
    },
  });

  console.log(`Found ${quizzapiFacts.length} QuizzAPI facts to fix\n`);

  let stats = {
    fixed: 0,
    errors: 0,
  };

  for (const fact of quizzapiFacts) {
    try {
      // Current (incorrect) structure
      const currentSubject = fact.subject; // Question
      const currentProperty = fact.property; // "réponse"
      const currentObject = fact.object; // Answer

      // New (correct) structure
      const newSubject = currentObject; // Answer becomes subject
      const newProperty = 'description'; // Always "description"
      const newObject = currentSubject; // Question becomes object

      console.log(`Fixing fact ${fact.id.substring(0, 8)}...`);
      console.log(`  AVANT: "${currentSubject}" -[${currentProperty}]-> "${currentObject}"`);
      console.log(`  APRÈS: "${newSubject}" -[${newProperty}]-> "${newObject}"`);

      // Update the fact with corrected structure
      // We need to handle the unique constraint on (subject, property, object)
      // So we update in a transaction

      await prisma.$transaction(async (tx) => {
        // First, temporarily change to a dummy value to avoid constraint conflicts
        await tx.fact.update({
          where: { id: fact.id },
          data: {
            subject: `__TEMP__${fact.id}`,
            property: '__TEMP__',
            object: '__TEMP__',
          },
        });

        // Then update to the correct values
        await tx.fact.update({
          where: { id: fact.id },
          data: {
            subject: newSubject,
            property: newProperty,
            object: newObject,
          },
        });
      });

      stats.fixed++;
      console.log(`  ✅ Fixed\n`);
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
      stats.errors++;
    }
  }

  console.log('========================================');
  console.log('📊 Migration Summary');
  console.log('========================================');
  console.log(`Total facts:     ${quizzapiFacts.length}`);
  console.log(`Fixed:           ${stats.fixed}`);
  console.log(`Errors:          ${stats.errors}`);
  console.log('========================================\n');

  // Verification
  console.log('🔍 Verification...\n');

  const verifyFacts = await prisma.fact.findMany({
    where: {
      source: { name: 'QuizzAPI.fr' },
    },
    take: 3,
    include: {
      questions: {
        take: 1,
        include: { acceptedAnswers: true },
      },
    },
  });

  console.log('Sample of corrected facts:\n');
  verifyFacts.forEach((f) => {
    console.log(`✅ "${f.subject}" -[${f.property}]-> "${f.object}"`);
    if (f.questions[0]) {
      console.log(`   Question: ${f.questions[0].text}`);
      console.log(`   Answer: ${f.questions[0].acceptedAnswers[0]?.answer}`);
    }
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
