/**
 * Script: Export All Questions to JSON
 *
 * Exports all questions with their answers, distractors, and metadata
 * to a JSON file for easy manual editing
 *
 * Usage: npx ts-node scripts/export/export-all-questions.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';
import * as fs from 'fs';
import * as path from 'path';

async function exportAllQuestions() {
  const prisma = getPrismaClient();

  try {
    console.log('\n📦 Exporting all questions...\n');

    const questions = await prisma.question.findMany({
      include: {
        category: true,
        fact: true,
        acceptedAnswers: {
          orderBy: { isPrimary: 'desc' },
        },
        distractors: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { status: 'asc' },
        { category: { name: 'asc' } },
        { createdAt: 'desc' },
      ],
    });

    const exportData = questions.map((q) => ({
      id: q.id,
      text: q.text,
      status: q.status,
      difficulty: q.difficulty,
      questionType: q.questionType,
      mediaUrl: q.mediaUrl,
      category: q.category?.name || null,
      enabledForDaily: q.enabledForDaily,
      enabledForMcq: q.enabledForMcq,
      successRate: q.successRate,
      answerCount: q.answerCount,
      acceptedAnswers: q.acceptedAnswers.map((a) => ({
        answer: a.answer,
        isPrimary: a.isPrimary,
        levenshteinThreshold: a.levenshteinThreshold,
      })),
      distractors: q.distractors.map((d) => ({
        text: d.distractorText,
        order: d.order,
      })),
      fact: q.fact
        ? {
            subject: q.fact.subject,
            property: q.fact.property,
            object: q.fact.object,
            wikidataId: q.fact.wikidataId,
          }
        : null,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));

    // Create exports directory if it doesn't exist
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Export to JSON
    const jsonPath = path.join(exportDir, `questions-export-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Exported ${questions.length} questions to:`);
    console.log(`   ${jsonPath}\n`);

    // Also create a summary CSV for quick overview
    const csvPath = path.join(exportDir, `questions-summary-${new Date().toISOString().split('T')[0]}.csv`);
    const csvHeaders = 'ID,Text,Category,Status,Difficulty,Type,Answers,Distractors\n';
    const csvRows = questions.map((q) => {
      const text = `"${q.text.replace(/"/g, '""')}"`;
      const category = `"${q.category?.name || 'N/A'}"`;
      const answerCount = q.acceptedAnswers.length;
      const distractorCount = q.distractors.length;
      return `${q.id},${text},${category},${q.status},${q.difficulty},${q.questionType},${answerCount},${distractorCount}`;
    });
    fs.writeFileSync(csvPath, csvHeaders + csvRows.join('\n'));

    console.log(`✅ Exported summary CSV to:`);
    console.log(`   ${csvPath}\n`);

    // Statistics
    const stats = {
      total: questions.length,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      withMedia: questions.filter((q) => q.mediaUrl).length,
      enabledForDaily: questions.filter((q) => q.enabledForDaily).length,
      enabledForMcq: questions.filter((q) => q.enabledForMcq).length,
    };

    questions.forEach((q) => {
      stats.byStatus[q.status] = (stats.byStatus[q.status] || 0) + 1;
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
      const cat = q.category?.name || 'N/A';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    console.log('📊 Statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Status: ${JSON.stringify(stats.byStatus, null, 2)}`);
    console.log(`   With media: ${stats.withMedia}`);
    console.log(`   Enabled for Daily: ${stats.enabledForDaily}`);
    console.log(`   Enabled for MCQ: ${stats.enabledForMcq}\n`);

    return exportData;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

if (require.main === module) {
  exportAllQuestions()
    .then(() => {
      console.log('✅ Export complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { exportAllQuestions };
