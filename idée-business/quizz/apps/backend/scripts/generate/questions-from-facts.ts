/**
 * Generate Questions from Facts
 *
 * Reads facts from the database and generates multiple question variants
 *
 * Usage: npx ts-node scripts/generate/questions-from-facts.ts
 */

import {
  getPrismaClient,
  closePrismaConnection,
  getCategoryBySlug,
} from '../utils/db';
import {
  CAPITAL_TEMPLATES,
  generateQuestionText,
  getAnswerFromFact,
  generateCapitalVariants,
  generateCountryVariants,
  calculateQuestionQuality,
  getLevenshteinThreshold,
} from '../utils/question-templates';
import { QUESTION_TYPES } from '../wikidata/config';

async function generateQuestionsFromFacts() {
  console.log('\n========================================');
  console.log('📝 Generating Questions from Facts');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Get all capital facts
    console.log('Step 1: Fetching capital facts from database...');

    const facts = await prisma.fact.findMany({
      where: {
        property: 'est la capitale de',
        active: true,
      },
      include: {
        category: true,
        source: true,
      },
    });

    console.log(`✓ Found ${facts.length} capital facts\n`);

    if (facts.length === 0) {
      console.log('⚠️  No facts found. Run ingestion script first.');
      return;
    }

    // Step 2: Generate questions for each fact
    console.log('Step 2: Generating questions from facts...');

    let totalGenerated = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const fact of facts) {
      const { subject, object: obj, data, interestScore, categoryId } = fact;

      // Parse additional data
      const factData = data as any;
      const capitalNameEn = factData?.capitalNameEn;
      const countryNameEn = factData?.countryNameEn;

      // Generate questions from each template
      for (const template of CAPITAL_TEMPLATES) {
        const questionText = generateQuestionText(template.template, subject, obj);
        const canonicalAnswer = getAnswerFromFact(template.answerField, subject, obj);

        // Generate answer variants
        let answerVariants: string[];
        if (template.answerField === 'subject') {
          // Answer is a capital
          answerVariants = generateCapitalVariants(canonicalAnswer);
        } else {
          // Answer is a country
          answerVariants = generateCountryVariants(canonicalAnswer, countryNameEn);
        }

        // Calculate quality score
        const qualityScore = calculateQuestionQuality(
          interestScore || 5,
          template.difficulty
        );

        totalGenerated++;

        try {
          // Check if question already exists
          const existing = await prisma.question.findUnique({
            where: { text: questionText },
          });

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Insert question
          const question = await prisma.question.create({
            data: {
              factId: fact.id,
              text: questionText,
              questionType: QUESTION_TYPES.TEXT,
              difficulty: template.difficulty,
              difficultyScore: template.difficultyScore,
              categoryId: categoryId || undefined,
              qualityScore,
              ambiguous: false,
              status: 'brouillon', // Will be validated later
            },
          });

          // Insert accepted answers
          const levenshteinThreshold = getLevenshteinThreshold(canonicalAnswer);

          for (let i = 0; i < answerVariants.length; i++) {
            const variant = answerVariants[i];

            await prisma.acceptedAnswer.create({
              data: {
                questionId: question.id,
                answer: variant,
                isPrimary: i === 0, // First variant is primary
                variantType: i === 0 ? 'exacte' : 'orthographe',
                levenshteinThreshold,
              },
            });
          }

          totalInserted++;

          if (totalInserted % 100 === 0) {
            console.log(`  Progress: ${totalInserted} questions inserted...`);
          }
        } catch (error: any) {
          if (error.code === 'P2002') {
            // Unique constraint violation - question already exists
            totalSkipped++;
          } else {
            console.error(`  ⚠️  Error creating question "${questionText}":`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Question generation complete!\n');

    // Step 3: Display statistics
    console.log('📊 Statistics:');
    console.log(`   Total generated: ${totalGenerated}`);
    console.log(`   Inserted: ${totalInserted}`);
    console.log(`   Skipped (duplicates): ${totalSkipped}\n`);

    // Count questions by difficulty
    const difficultyStats = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: true,
      where: {
        status: 'brouillon',
      },
    });

    console.log('📈 Questions by Difficulty:');
    difficultyStats.forEach((stat) => {
      console.log(`   ${stat.difficulty}: ${stat._count}`);
    });

    // Count total questions
    const totalQuestions = await prisma.question.count();
    console.log(`\n📚 Total questions in database: ${totalQuestions}`);

    // Sample questions
    console.log('\n📝 Sample Questions Generated:\n');
    console.log('─'.repeat(80));

    const samples = await prisma.question.findMany({
      take: 10,
      include: {
        acceptedAnswers: true,
        fact: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    samples.forEach((q, index) => {
      const primaryAnswer = q.acceptedAnswers.find((a) => a.isPrimary);
      const otherAnswers = q.acceptedAnswers.filter((a) => !a.isPrimary);

      console.log(`${index + 1}. ${q.text}`);
      console.log(`   → Réponse: ${primaryAnswer?.answer}`);
      if (otherAnswers.length > 0) {
        console.log(
          `   → Variantes acceptées: ${otherAnswers.map((a) => a.answer).join(', ')}`
        );
      }
      console.log(`   → Difficulté: ${q.difficulty} (${q.difficultyScore}/100)`);
      console.log(`   → Qualité: ${q.qualityScore}/100`);
      console.log('');
    });

    console.log('─'.repeat(80));

    return {
      generated: totalGenerated,
      inserted: totalInserted,
      skipped: totalSkipped,
    };
  } catch (error) {
    console.error('\n❌ Question generation failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  generateQuestionsFromFacts()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { generateQuestionsFromFacts };
