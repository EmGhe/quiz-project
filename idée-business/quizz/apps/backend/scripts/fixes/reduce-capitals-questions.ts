/**
 * Script: Reduce Capitals Questions by 30%
 *
 * Priority order (keep):
 * 1. European capitals
 * 2. Major Asian countries (by GDP/population)
 * 3. Major African and Latin American countries
 * 4. New Zealand and Australia
 *
 * Usage: npx ts-node scripts/fixes/reduce-capitals-questions.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

// Major countries to keep (by GDP and/or population)
const PRIORITY_COUNTRIES = {
  // European countries - keep all
  europe: [
    'France', 'Allemagne', 'Italie', 'Espagne', 'Royaume-Uni', 'Pologne',
    'Pays-Bas', 'Belgique', 'Grèce', 'Portugal', 'République tchèque', 'Tchéquie',
    'Roumanie', 'Suède', 'Hongrie', 'Autriche', 'Bulgarie', 'Danemark',
    'Finlande', 'Slovaquie', 'Irlande', 'Croatie', 'Lituanie', 'Slovénie',
    'Lettonie', 'Estonie', 'Chypre', 'Luxembourg', 'Malte', 'Suisse',
    'Norvège', 'Islande', 'Serbie', 'Ukraine', 'Biélorussie', 'Bosnie-Herzégovine',
    'Albanie', 'Moldavie', 'Monténégro', 'Kosovo', 'Macédoine du Nord',
  ],

  // Major Asian countries (GDP/population)
  asia: [
    'Chine', 'Japon', 'Inde', 'Corée du Sud', 'Indonésie', 'Turquie',
    'Arabie saoudite', 'Thaïlande', 'Israël', 'Émirats arabes unis',
    'Malaisie', 'Singapour', 'Philippines', 'Vietnam', 'Bangladesh',
    'Pakistan', 'Iran', 'Irak', 'Kazakhstan', 'Qatar',
  ],

  // Major African countries
  africa: [
    'Afrique du Sud', 'Nigéria', 'Nigeria', 'Égypte', 'Algérie', 'Maroc',
    'Kenya', 'Éthiopie', 'Ghana', 'Tanzanie', 'Angola', 'Tunisie',
  ],

  // Major Latin American countries + North America
  latinAmerica: [
    'Brésil', 'Mexique', 'Argentine', 'Colombie', 'Chili',
    'Pérou', 'Venezuela', 'Équateur', 'Guatemala', 'Cuba',
    'Canada', 'États-Unis',
  ],

  // Oceania
  oceania: ['Australie', 'Nouvelle-Zélande'],
};

// Flatten all priority countries
const ALL_PRIORITY_COUNTRIES = [
  ...PRIORITY_COUNTRIES.europe,
  ...PRIORITY_COUNTRIES.asia,
  ...PRIORITY_COUNTRIES.africa,
  ...PRIORITY_COUNTRIES.latinAmerica,
  ...PRIORITY_COUNTRIES.oceania,
];

async function analyzeCapitalsQuestions() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Analyzing Capitals Questions');
    console.log('========================================\n');

    // Find all questions about capitals using Facts
    const capitalsQuestions = await prisma.question.findMany({
      where: {
        OR: [
          { text: { contains: 'capitale de' } },
          { text: { contains: 'Capitale de' } },
          { text: { contains: 'quelle est la capitale' } },
          { text: { contains: 'Quelle est la capitale' } },
        ],
        status: 'publie',
      },
      include: {
        category: true,
        fact: true, // Include the related fact
        acceptedAnswers: {
          where: { isPrimary: true },
        },
      },
    });

    console.log(`📊 Total capitals questions: ${capitalsQuestions.length}\n`);

    // Analyze by extracting country names from Facts
    const questionsByCountry = new Map<string, any[]>();

    for (const question of capitalsQuestions) {
      // Extract country name from the related Fact
      // Fact structure: "subject (capital) est la capitale de object (country)"
      const country = question.fact.object;

      if (!questionsByCountry.has(country)) {
        questionsByCountry.set(country, []);
      }
      questionsByCountry.get(country)!.push(question);
    }

    console.log(`🌍 Countries found: ${questionsByCountry.size}\n`);

    // Categorize questions
    const priorityQuestions: any[] = [];
    const lowPriorityQuestions: any[] = [];

    for (const [country, questions] of questionsByCountry.entries()) {
      const isPriority = ALL_PRIORITY_COUNTRIES.some(priorityCountry =>
        country.toLowerCase().includes(priorityCountry.toLowerCase()) ||
        priorityCountry.toLowerCase().includes(country.toLowerCase())
      );

      if (isPriority) {
        priorityQuestions.push(...questions);
      } else {
        lowPriorityQuestions.push(...questions);
      }
    }

    console.log('📈 Analysis Results:');
    console.log(`   Priority questions (to keep): ${priorityQuestions.length}`);
    console.log(`   Low priority questions: ${lowPriorityQuestions.length}`);
    console.log(`   Total: ${capitalsQuestions.length}\n`);

    // Calculate 30% reduction
    const targetReduction = Math.floor(capitalsQuestions.length * 0.3);
    const actualToDelete = Math.min(targetReduction, lowPriorityQuestions.length);

    console.log('🎯 Deletion Plan:');
    console.log(`   Target 30% reduction: ${targetReduction} questions`);
    console.log(`   Available low priority: ${lowPriorityQuestions.length} questions`);
    console.log(`   Will delete: ${actualToDelete} questions\n`);

    // Select questions to delete (from low priority first)
    const questionsToDelete = lowPriorityQuestions.slice(0, actualToDelete);

    // If we need more deletions, sample from priority (shouldn't happen if we have enough low priority)
    if (questionsToDelete.length < targetReduction && priorityQuestions.length > 0) {
      const remaining = targetReduction - questionsToDelete.length;
      console.log(`⚠️  Need to delete ${remaining} more from priority countries\n`);

      // Take from the end of priority list (less important priorities)
      const additionalDeletes = priorityQuestions.slice(-remaining);
      questionsToDelete.push(...additionalDeletes);
    }

    // Display what will be deleted
    console.log('📋 Questions to delete:');
    const deleteCountByCountry = new Map<string, number>();

    for (const q of questionsToDelete) {
      const country = q.fact.object;
      deleteCountByCountry.set(country, (deleteCountByCountry.get(country) || 0) + 1);
    }

    // Sort by count
    const sortedDeletes = Array.from(deleteCountByCountry.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedDeletes.forEach(([country, count]) => {
      console.log(`   ${country}: ${count}`);
    });

    console.log('\n========================================');
    console.log('❓ Proceed with deletion? (yes/no)');
    console.log('========================================\n');

    // For safety, we'll just show the IDs and export to SQL
    console.log('📝 Generating SQL delete script...\n');

    const deleteIds = questionsToDelete.map(q => q.id);

    // Write to file
    const fs = require('fs');
    const path = require('path');
    const exportDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Format UUIDs with quotes for SQL
    const deleteIdsQuoted = deleteIds.map(id => `'${id}'`);
    const sqlStatements = [
      '-- Delete Accepted Answers',
      `DELETE FROM "reponses_acceptees" WHERE "questionId" IN (${deleteIdsQuoted.join(', ')});`,
      '',
      '-- Delete Distractors',
      `DELETE FROM "distractors" WHERE "questionId" IN (${deleteIdsQuoted.join(', ')});`,
      '',
      '-- Delete Question Metadata',
      `DELETE FROM "question_metadata" WHERE "questionId" IN (${deleteIdsQuoted.join(', ')});`,
      '',
      '-- Delete Questions',
      `DELETE FROM "questions" WHERE id IN (${deleteIdsQuoted.join(', ')});`,
      '',
      `-- Total questions to delete: ${deleteIds.length}`,
    ];

    const sqlPath = path.join(exportDir, 'delete-capitals-30percent.sql');
    fs.writeFileSync(sqlPath, sqlStatements.join('\n'));

    console.log(`✅ SQL script written to: ${sqlPath}`);
    console.log('\nTo execute the deletion, run:');
    console.log(`   psql -U postgres -d quiz_db < ${sqlPath}\n`);

    // Also export JSON for review
    const jsonPath = path.join(exportDir, 'delete-capitals-30percent.json');
    const exportData = {
      summary: {
        total: capitalsQuestions.length,
        targetReduction: targetReduction,
        actualDeletes: questionsToDelete.length,
        priorityKept: priorityQuestions.length - (questionsToDelete.length - lowPriorityQuestions.length),
        lowPriorityDeleted: Math.min(actualToDelete, lowPriorityQuestions.length),
      },
      deleteByCountry: Object.fromEntries(sortedDeletes),
      questionIds: deleteIds,
      questions: questionsToDelete.map(q => ({
        id: q.id,
        text: q.text,
        category: q.category.name,
      })),
    };

    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ JSON report written to: ${jsonPath}\n`);

    return {
      total: capitalsQuestions.length,
      toDelete: questionsToDelete.length,
      toKeep: capitalsQuestions.length - questionsToDelete.length,
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Execute if run directly
if (require.main === module) {
  analyzeCapitalsQuestions()
    .then((result) => {
      console.log('\n✅ Analysis complete!');
      console.log(`   Total: ${result.total}`);
      console.log(`   To delete: ${result.toDelete} (${((result.toDelete / result.total) * 100).toFixed(1)}%)`);
      console.log(`   To keep: ${result.toKeep} (${((result.toKeep / result.total) * 100).toFixed(1)}%)\n`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { analyzeCapitalsQuestions };