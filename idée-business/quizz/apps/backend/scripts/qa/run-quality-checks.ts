import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QualityIssue {
  type: 'duplicate' | 'distractor' | 'answer' | 'category_balance' | 'difficulty';
  severity: 'critical' | 'warning' | 'info';
  questionId?: string;
  message: string;
  details?: any;
}

const issues: QualityIssue[] = [];

// Fonction de similarité Levenshtein
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return ((maxLen - distance) / maxLen) * 100;
}

// 1. Duplicate Detection (>80% similarity)
async function checkDuplicates() {
  console.log('\n📝 Checking for duplicate questions...\n');

  const questions = await prisma.question.findMany({
    where: { status: 'publie' },
    select: { id: true, text: true },
  });

  const duplicates: Array<{ q1: string; q2: string; similarity: number }> = [];

  // Only check for high similarity (>90%) to avoid template-based false positives
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const sim = similarity(questions[i].text, questions[j].text);
      if (sim >= 90) {
        duplicates.push({
          q1: questions[i].text,
          q2: questions[j].text,
          similarity: Math.round(sim),
        });

        issues.push({
          type: 'duplicate',
          severity: sim >= 95 ? 'critical' : 'warning',
          questionId: questions[i].id,
          message: `Question très similaire (${Math.round(sim)}%)`,
          details: {
            question1: questions[i].text.substring(0, 100),
            question2: questions[j].text.substring(0, 100),
            similarity: sim,
          },
        });
      }
    }
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} potential duplicates:`);
    duplicates.slice(0, 5).forEach(d => {
      console.log(`   ${d.similarity}% - "${d.q1.substring(0, 60)}..."`);
      console.log(`        vs "${d.q2.substring(0, 60)}..."\n`);
    });
  } else {
    console.log('✅ No duplicates found');
  }

  return duplicates.length;
}

// 2. Distractor Validation (MCQ questions should have 3-4 unique distractors)
async function checkDistractors() {
  console.log('\n🎯 Checking MCQ distractors...\n');

  const mcqQuestions = await prisma.question.findMany({
    where: {
      status: 'publie',
      enabledForMcq: true,
    },
    include: {
      distractors: true,
      acceptedAnswers: { where: { isPrimary: true } },
    },
  });

  let invalidCount = 0;

  for (const question of mcqQuestions) {
    const distractorCount = question.distractors.length;
    const uniqueDistractors = new Set(question.distractors.map(d => d.distractorText.toLowerCase()));
    const correctAnswer = question.acceptedAnswers[0]?.answer.toLowerCase();

    // Check count
    if (distractorCount < 3) {
      issues.push({
        type: 'distractor',
        severity: 'critical',
        questionId: question.id,
        message: `MCQ question has only ${distractorCount} distractors (needs 3-4)`,
        details: { question: question.text.substring(0, 100) },
      });
      invalidCount++;
    }

    // Check uniqueness
    if (uniqueDistractors.size !== distractorCount) {
      issues.push({
        type: 'distractor',
        severity: 'warning',
        questionId: question.id,
        message: 'Duplicate distractors found',
        details: { question: question.text.substring(0, 100) },
      });
      invalidCount++;
    }

    // Check if distractor == correct answer
    const distractorMatchesAnswer = question.distractors.some(
      d => d.distractorText.toLowerCase() === correctAnswer
    );

    if (distractorMatchesAnswer) {
      issues.push({
        type: 'distractor',
        severity: 'critical',
        questionId: question.id,
        message: 'Distractor matches correct answer',
        details: { question: question.text.substring(0, 100) },
      });
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    console.log(`⚠️  Found ${invalidCount} MCQ questions with distractor issues`);
  } else {
    console.log(`✅ All ${mcqQuestions.length} MCQ questions have valid distractors`);
  }

  return invalidCount;
}

// 3. Answer Validation
async function checkAnswers() {
  console.log('\n✔️  Checking answer validation...\n');

  const questions = await prisma.question.findMany({
    where: { status: 'publie' },
    include: { acceptedAnswers: true },
  });

  let invalidCount = 0;

  for (const question of questions) {
    // Check if has at least one answer
    if (question.acceptedAnswers.length === 0) {
      issues.push({
        type: 'answer',
        severity: 'critical',
        questionId: question.id,
        message: 'Question has no accepted answers',
        details: { question: question.text.substring(0, 100) },
      });
      invalidCount++;
    }

    // Check if has primary answer
    const hasPrimary = question.acceptedAnswers.some(a => a.isPrimary);
    if (!hasPrimary) {
      issues.push({
        type: 'answer',
        severity: 'critical',
        questionId: question.id,
        message: 'Question has no primary answer',
        details: { question: question.text.substring(0, 100) },
      });
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    console.log(`⚠️  Found ${invalidCount} questions with answer issues`);
  } else {
    console.log(`✅ All ${questions.length} questions have valid answers`);
  }

  return invalidCount;
}

// 4. Category Balance Check
async function checkCategoryBalance() {
  console.log('\n📊 Checking category balance...\n');

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          questions: {
            where: { status: 'publie' },
          },
        },
      },
    },
  });

  const categoriesWithQuestions = categories
    .filter(c => c._count.questions > 0)
    .sort((a, b) => b._count.questions - a._count.questions);

  console.log('Category distribution:');
  categoriesWithQuestions.forEach(cat => {
    const count = cat._count.questions;
    const bar = '█'.repeat(Math.floor(count / 20));
    console.log(`  ${cat.name.padEnd(40)} ${count.toString().padStart(4)} ${bar}`);

    if (count < 10) {
      issues.push({
        type: 'category_balance',
        severity: 'warning',
        message: `Category "${cat.name}" has only ${count} questions (recommended: 50+)`,
      });
    }
  });

  const totalQuestions = categoriesWithQuestions.reduce((sum, c) => sum + c._count.questions, 0);
  console.log(`\n  Total: ${totalQuestions} questions across ${categoriesWithQuestions.length} categories`);

  return categoriesWithQuestions.length;
}

// 5. Difficulty Distribution
async function checkDifficultyDistribution() {
  console.log('\n⚖️  Checking difficulty distribution...\n');

  const distribution = await prisma.question.groupBy({
    by: ['difficulty'],
    where: { status: 'publie' },
    _count: true,
  });

  const total = distribution.reduce((sum, d) => sum + d._count, 0);

  console.log('Difficulty distribution:');
  distribution.forEach(d => {
    const percentage = ((d._count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(parseFloat(percentage) / 2));
    const difficultyLabel = d.difficulty || 'non défini';
    console.log(`  ${difficultyLabel.padEnd(12)} ${percentage.padStart(5)}% ${bar}`);
  });

  // Target: 20% facile, 60% moyen, 20% difficile
  const facile = distribution.find(d => d.difficulty === 'facile')?._count || 0;
  const moyen = distribution.find(d => d.difficulty === 'moyen')?._count || 0;
  const difficile = distribution.find(d => d.difficulty === 'difficile')?._count || 0;

  const facilePercent = (facile / total) * 100;
  const moyenPercent = (moyen / total) * 100;
  const difficilePercent = (difficile / total) * 100;

  console.log('\nTarget: 20% facile, 60% moyen, 20% difficile');

  if (Math.abs(facilePercent - 20) > 10) {
    issues.push({
      type: 'difficulty',
      severity: 'info',
      message: `Facile: ${facilePercent.toFixed(1)}% (target: 20%)`,
    });
  }

  if (Math.abs(moyenPercent - 60) > 10) {
    issues.push({
      type: 'difficulty',
      severity: 'info',
      message: `Moyen: ${moyenPercent.toFixed(1)}% (target: 60%)`,
    });
  }

  return distribution.length;
}

// Main
async function main() {
  console.log('🔍 Running Quality Checks...\n');
  console.log('='.repeat(70));

  await checkDuplicates();
  await checkDistractors();
  await checkAnswers();
  await checkCategoryBalance();
  await checkDifficultyDistribution();

  console.log('\n' + '='.repeat(70));
  console.log('\n📋 Summary:\n');

  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;

  console.log(`  🔴 Critical: ${critical}`);
  console.log(`  🟡 Warnings: ${warnings}`);
  console.log(`  🔵 Info:     ${info}`);

  if (critical > 0) {
    console.log('\n⚠️  Critical issues found! Review required.');
  } else if (warnings > 0) {
    console.log('\n✅ No critical issues, but some warnings to review.');
  } else {
    console.log('\n✅ All quality checks passed!');
  }

  // Export issues to file
  if (issues.length > 0) {
    const fs = require('fs');
    const outputPath = 'exports/quality-issues.json';
    fs.writeFileSync(outputPath, JSON.stringify(issues, null, 2));
    console.log(`\n📄 Detailed report saved to: ${outputPath}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
