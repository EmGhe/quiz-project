/**
 * Export Questions for Manual QA Review
 *
 * Exports a representative sample of questions to CSV and Markdown formats
 *
 * Usage: npx ts-node scripts/qa/export-for-review.ts [sample-size]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getPrismaClient,
  closePrismaConnection,
} from '../utils/db';

interface QuestionForReview {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedVariants: string[];
  distractors: string[];
  difficulty: string;
  difficultyScore: number;
  qualityScore: number;
  category: string;
  fact: {
    subject: string;
    property: string;
    object: string;
    geoRegion: string;
  };
}

async function exportForReview(sampleSize: number = 50) {
  console.log('\n========================================');
  console.log('📤 Exporting Questions for QA Review');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Get stratified sample of questions
    console.log(`Step 1: Selecting ${sampleSize} questions for review...\n`);

    // Get questions by difficulty for stratified sampling
    const easyQuestions = await prisma.question.findMany({
      where: {
        difficulty: 'facile',
        status: 'brouillon',
      },
      include: {
        acceptedAnswers: true,
        distractors: true,
        fact: true,
        category: true,
      },
      orderBy: {
        qualityScore: 'desc',
      },
      take: Math.floor(sampleSize * 0.4), // 40% easy
    });

    const mediumQuestions = await prisma.question.findMany({
      where: {
        difficulty: 'moyen',
        status: 'brouillon',
      },
      include: {
        acceptedAnswers: true,
        distractors: true,
        fact: true,
        category: true,
      },
      orderBy: {
        qualityScore: 'desc',
      },
      take: Math.floor(sampleSize * 0.6), // 60% medium
    });

    const allSamples = [...easyQuestions, ...mediumQuestions];

    console.log(`✓ Selected ${allSamples.length} questions:`);
    console.log(`  - Easy: ${easyQuestions.length}`);
    console.log(`  - Medium: ${mediumQuestions.length}\n`);

    // Step 2: Format for review
    const questionsForReview: QuestionForReview[] = allSamples.map((q) => {
      const primaryAnswer = q.acceptedAnswers.find((a) => a.isPrimary);
      const variants = q.acceptedAnswers
        .filter((a) => !a.isPrimary)
        .map((a) => a.answer);

      return {
        id: q.id,
        text: q.text,
        correctAnswer: primaryAnswer?.answer || 'N/A',
        acceptedVariants: variants,
        distractors: q.distractors
          .sort((a, b) => a.order - b.order)
          .map((d) => d.distractorText),
        difficulty: q.difficulty || 'N/A',
        difficultyScore: q.difficultyScore || 0,
        qualityScore: q.qualityScore || 0,
        category: q.category?.name || 'N/A',
        fact: {
          subject: q.fact.subject,
          property: q.fact.property,
          object: q.fact.object,
          geoRegion: q.fact.geoRegion || 'N/A',
        },
      };
    });

    // Step 3: Create export directory
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Step 4: Export to CSV
    console.log('Step 2: Exporting to CSV...');
    const csvPath = path.join(exportDir, `qa-review-${timestamp}.csv`);
    await exportToCSV(questionsForReview, csvPath);
    console.log(`✓ CSV exported to: ${csvPath}\n`);

    // Step 5: Export to Markdown
    console.log('Step 3: Exporting to Markdown...');
    const mdPath = path.join(exportDir, `qa-review-${timestamp}.md`);
    await exportToMarkdown(questionsForReview, mdPath);
    console.log(`✓ Markdown exported to: ${mdPath}\n`);

    // Step 6: Export to JSON (for programmatic review)
    console.log('Step 4: Exporting to JSON...');
    const jsonPath = path.join(exportDir, `qa-review-${timestamp}.json`);
    await exportToJSON(questionsForReview, jsonPath);
    console.log(`✓ JSON exported to: ${jsonPath}\n`);

    // Step 7: Display summary
    console.log('📊 Export Summary:\n');
    console.log(`Total questions exported: ${questionsForReview.length}`);
    console.log(`\nFiles created:`);
    console.log(`  1. ${csvPath}`);
    console.log(`  2. ${mdPath}`);
    console.log(`  3. ${jsonPath}`);

    console.log('\n📝 Review Instructions:\n');
    console.log('1. Open the CSV file in Excel/Google Sheets for easy review');
    console.log('2. Check each question for:');
    console.log('   - Grammar and clarity');
    console.log('   - Factual correctness');
    console.log('   - Plausible distractors');
    console.log('   - No ambiguity');
    console.log('3. Mark status as: APPROVED / REJECTED / NEEDS_FIX');
    console.log('4. Add comments for rejected/needs-fix questions');
    console.log('5. Save and import back for batch update');

    console.log('\n✅ Export complete!\n');

    return {
      csvPath,
      mdPath,
      jsonPath,
      count: questionsForReview.length,
    };
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

/**
 * Export to CSV format
 */
async function exportToCSV(
  questions: QuestionForReview[],
  filePath: string
): Promise<void> {
  const headers = [
    'ID',
    'Question',
    'Correct Answer',
    'Accepted Variants',
    'Distractor 1',
    'Distractor 2',
    'Distractor 3',
    'Distractor 4',
    'Difficulty',
    'Quality Score',
    'Category',
    'Geo Region',
    'Fact Source',
    'Status',
    'Comments',
  ];

  const rows = questions.map((q) => [
    q.id,
    `"${q.text}"`,
    `"${q.correctAnswer}"`,
    `"${q.acceptedVariants.join(', ')}"`,
    q.distractors[0] ? `"${q.distractors[0]}"` : '',
    q.distractors[1] ? `"${q.distractors[1]}"` : '',
    q.distractors[2] ? `"${q.distractors[2]}"` : '',
    q.distractors[3] ? `"${q.distractors[3]}"` : '',
    q.difficulty,
    q.qualityScore,
    q.category,
    q.fact.geoRegion,
    `"${q.fact.subject} ${q.fact.property} ${q.fact.object}"`,
    '', // Status - to be filled by reviewer
    '', // Comments - to be filled by reviewer
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  fs.writeFileSync(filePath, csv, 'utf-8');
}

/**
 * Export to Markdown format
 */
async function exportToMarkdown(
  questions: QuestionForReview[],
  filePath: string
): Promise<void> {
  const lines: string[] = [];

  lines.push('# Questions QA Review');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  lines.push(`**Total Questions:** ${questions.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  questions.forEach((q, index) => {
    lines.push(`## Question ${index + 1}`);
    lines.push('');
    lines.push(`**ID:** \`${q.id}\``);
    lines.push('');
    lines.push(`### ${q.text}`);
    lines.push('');
    lines.push('**Choix:**');
    lines.push(`- ✅ **${q.correctAnswer}** (Réponse correcte)`);
    q.distractors.forEach((d) => {
      lines.push(`- ${d}`);
    });
    lines.push('');
    lines.push('**Métadonnées:**');
    lines.push(`- Difficulté: ${q.difficulty} (${q.difficultyScore}/100)`);
    lines.push(`- Qualité: ${q.qualityScore}/100`);
    lines.push(`- Catégorie: ${q.category}`);
    lines.push(`- Région: ${q.fact.geoRegion}`);
    lines.push('');
    lines.push('**Variantes acceptées:**');
    if (q.acceptedVariants.length > 0) {
      q.acceptedVariants.forEach((v) => lines.push(`- ${v}`));
    } else {
      lines.push('- (aucune variante)');
    }
    lines.push('');
    lines.push('**Source:**');
    lines.push(
      `> ${q.fact.subject} ${q.fact.property} ${q.fact.object}`
    );
    lines.push('');
    lines.push('**Review:**');
    lines.push('- [ ] Approuvée');
    lines.push('- [ ] Rejetée');
    lines.push('- [ ] Nécessite correction');
    lines.push('');
    lines.push('**Commentaires:**');
    lines.push('```');
    lines.push('');
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Export to JSON format
 */
async function exportToJSON(
  questions: QuestionForReview[],
  filePath: string
): Promise<void> {
  const data = {
    exportDate: new Date().toISOString(),
    totalQuestions: questions.length,
    questions: questions.map((q) => ({
      ...q,
      review: {
        status: '', // APPROVED / REJECTED / NEEDS_FIX
        comments: '',
        reviewedBy: '',
        reviewedAt: '',
      },
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Run if executed directly
if (require.main === module) {
  const sampleSize = parseInt(process.argv[2] || '50', 10);

  exportForReview(sampleSize)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { exportForReview };
