/**
 * Script: Check Missing Distractors
 *
 * Identifies all questions that don't have exactly 4 distractors
 * Required: Each question should have 4 unique distractors for MCQ format
 *
 * Usage: npx ts-node scripts/qa/check-missing-distractors.ts
 */

import { getPrismaClient, closePrismaConnection } from '../utils/db';

interface QuestionWithDistractors {
  id: string;
  text: string;
  status: string;
  category: { name: string } | null;
  difficulty: string | null;
  enabledForMcq: boolean;
  _count: {
    distractors: number;
  };
}

async function checkMissingDistractors() {
  const prisma = getPrismaClient();

  try {
    console.log('\n========================================');
    console.log('🔍 Checking Questions for Missing Distractors');
    console.log('========================================\n');

    // Get all published questions with their distractor count
    const questions = await prisma.question.findMany({
      where: {
        status: 'publie',
      },
      include: {
        category: {
          select: { name: true },
        },
        _count: {
          select: { distractors: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total published questions: ${questions.length}\n`);

    // Analyze distractor counts
    const distractorStats = {
      perfect: [] as QuestionWithDistractors[],     // 4 distractors
      missing: [] as QuestionWithDistractors[],     // 0-3 distractors
      extra: [] as QuestionWithDistractors[],       // 5+ distractors
    };

    questions.forEach((q) => {
      const count = q._count.distractors;
      if (count === 4) {
        distractorStats.perfect.push(q as QuestionWithDistractors);
      } else if (count < 4) {
        distractorStats.missing.push(q as QuestionWithDistractors);
      } else {
        distractorStats.extra.push(q as QuestionWithDistractors);
      }
    });

    // Display statistics
    console.log('📈 Distractor Statistics:');
    console.log(`   ✅ Perfect (4 distractors): ${distractorStats.perfect.length}`);
    console.log(`   ⚠️  Missing (0-3 distractors): ${distractorStats.missing.length}`);
    console.log(`   ℹ️  Extra (5+ distractors): ${distractorStats.extra.length}\n`);

    // Breakdown by distractor count for missing
    if (distractorStats.missing.length > 0) {
      console.log('🔍 Breakdown of Missing Distractors:');
      const countMap = new Map<number, QuestionWithDistractors[]>();

      distractorStats.missing.forEach((q) => {
        const count = q._count.distractors;
        if (!countMap.has(count)) {
          countMap.set(count, []);
        }
        countMap.get(count)!.push(q);
      });

      // Sort by count
      const sortedCounts = Array.from(countMap.entries()).sort((a, b) => a[0] - b[0]);

      sortedCounts.forEach(([count, questions]) => {
        const needed = 4 - count;
        console.log(`   ${count} distractor${count !== 1 ? 's' : ''}: ${questions.length} questions (need ${needed} more each)`);
      });
      console.log('');

      // Breakdown by category
      console.log('📚 Missing Distractors by Category:');
      const categoryMap = new Map<string, number>();

      distractorStats.missing.forEach((q) => {
        const category = q.category?.name || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const sortedCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1]);

      sortedCategories.forEach(([category, count]) => {
        console.log(`   ${category}: ${count} questions`);
      });
      console.log('');

      // Show MCQ-enabled questions with missing distractors
      const mcqMissing = distractorStats.missing.filter(q => q.enabledForMcq);
      if (mcqMissing.length > 0) {
        console.log(`⚠️  CRITICAL: ${mcqMissing.length} MCQ-enabled questions have missing distractors!\n`);
      }

      // Export detailed report
      console.log('📝 Generating detailed report...\n');

      const fs = require('fs');
      const path = require('path');
      const exportDir = path.join(__dirname, '../../exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // CSV Report
      const csvPath = path.join(exportDir, 'missing-distractors.csv');
      const csvRows = [
        'Question ID,Text,Category,Difficulty,Distractor Count,Needed,MCQ Enabled',
        ...distractorStats.missing.map((q) => {
          const text = q.text.replace(/"/g, '""'); // Escape quotes
          const needed = 4 - q._count.distractors;
          return `"${q.id}","${text}","${q.category?.name || 'N/A'}","${q.difficulty || 'N/A'}",${q._count.distractors},${needed},${q.enabledForMcq}`;
        }),
      ];
      fs.writeFileSync(csvPath, csvRows.join('\n'));
      console.log(`✅ CSV report: ${csvPath}`);

      // JSON Report
      const jsonPath = path.join(exportDir, 'missing-distractors.json');
      const jsonReport = {
        summary: {
          total: questions.length,
          perfect: distractorStats.perfect.length,
          missing: distractorStats.missing.length,
          extra: distractorStats.extra.length,
          mcqMissing: mcqMissing.length,
        },
        breakdown: {
          byCount: Object.fromEntries(
            sortedCounts.map(([count, qs]) => [count, qs.length])
          ),
          byCategory: Object.fromEntries(sortedCategories),
        },
        questions: distractorStats.missing.map((q) => ({
          id: q.id,
          text: q.text,
          category: q.category?.name || 'N/A',
          difficulty: q.difficulty || 'N/A',
          distractorCount: q._count.distractors,
          needed: 4 - q._count.distractors,
          enabledForMcq: q.enabledForMcq,
        })),
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
      console.log(`✅ JSON report: ${jsonPath}`);

      // Markdown Report
      const mdPath = path.join(exportDir, 'missing-distractors.md');
      const mdContent = [
        '# Missing Distractors Report',
        '',
        `**Generated:** ${new Date().toISOString()}`,
        '',
        '## Summary',
        '',
        `- **Total published questions:** ${questions.length}`,
        `- **Perfect (4 distractors):** ${distractorStats.perfect.length} ✅`,
        `- **Missing (0-3 distractors):** ${distractorStats.missing.length} ⚠️`,
        `- **Extra (5+ distractors):** ${distractorStats.extra.length} ℹ️`,
        `- **MCQ-enabled with missing:** ${mcqMissing.length} 🔴`,
        '',
        '## Breakdown by Distractor Count',
        '',
        '| Count | Questions | Needed Each |',
        '|-------|-----------|-------------|',
        ...sortedCounts.map(([count, qs]) => {
          const needed = 4 - count;
          return `| ${count} | ${qs.length} | ${needed} |`;
        }),
        '',
        '## Breakdown by Category',
        '',
        '| Category | Questions |',
        '|----------|-----------|',
        ...sortedCategories.map(([cat, count]) => `| ${cat} | ${count} |`),
        '',
        '## Questions with Missing Distractors',
        '',
        '| ID | Text | Category | Difficulty | Current | Needed | MCQ |',
        '|-----|------|----------|------------|---------|--------|-----|',
        ...distractorStats.missing.slice(0, 50).map((q) => {
          const text = q.text.length > 60 ? q.text.substring(0, 60) + '...' : q.text;
          const needed = 4 - q._count.distractors;
          return `| ${q.id.substring(0, 8)}... | ${text} | ${q.category?.name || 'N/A'} | ${q.difficulty || 'N/A'} | ${q._count.distractors} | ${needed} | ${q.enabledForMcq ? '✓' : ''} |`;
        }),
        '',
        distractorStats.missing.length > 50 ? `_... and ${distractorStats.missing.length - 50} more (see JSON/CSV for full list)_` : '',
      ];
      fs.writeFileSync(mdPath, mdContent.join('\n'));
      console.log(`✅ Markdown report: ${mdPath}\n`);
    } else {
      console.log('🎉 All questions have exactly 4 distractors!\n');
    }

    // Summary
    const percentage = ((distractorStats.perfect.length / questions.length) * 100).toFixed(1);
    console.log('========================================');
    console.log('📊 Final Statistics:');
    console.log(`   ${distractorStats.perfect.length} / ${questions.length} questions have 4 distractors (${percentage}%)`);
    console.log(`   ${distractorStats.missing.length} questions need distractor completion`);
    console.log('========================================\n');

    return {
      total: questions.length,
      perfect: distractorStats.perfect.length,
      missing: distractorStats.missing.length,
      extra: distractorStats.extra.length,
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
  checkMissingDistractors()
    .then((result) => {
      console.log('✅ Analysis complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkMissingDistractors };
