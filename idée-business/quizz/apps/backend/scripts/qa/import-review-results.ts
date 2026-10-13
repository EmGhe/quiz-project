/**
 * Import QA Review Results
 *
 * Reads reviewed questions from CSV and updates database statuses
 *
 * Usage: npx ts-node scripts/qa/import-review-results.ts <csv-file-path>
 */

import * as fs from 'fs';
import {
  getPrismaClient,
  closePrismaConnection,
} from '../utils/db';

interface ReviewResult {
  id: string;
  status: string;
  comments: string;
}

async function importReviewResults(csvPath: string) {
  console.log('\n========================================');
  console.log('📥 Importing QA Review Results');
  console.log('========================================\n');

  const prisma = getPrismaClient();

  try {
    // Step 1: Read CSV file
    console.log(`Step 1: Reading CSV file: ${csvPath}...`);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`File not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse CSV (skip header)
    const results: ReviewResult[] = [];
    const headers = lines[0].split(',');
    const statusIndex = headers.findIndex((h) => h === 'Status');
    const commentsIndex = headers.findIndex((h) => h === 'Comments');
    const idIndex = headers.findIndex((h) => h === 'ID');

    if (statusIndex === -1 || commentsIndex === -1 || idIndex === -1) {
      throw new Error('CSV missing required columns: ID, Status, Comments');
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const id = cols[idIndex]?.trim();
      const status = cols[statusIndex]?.trim();
      const comments = cols[commentsIndex]?.trim() || '';

      if (id && status) {
        results.push({ id, status, comments });
      }
    }

    console.log(`✓ Parsed ${results.length} review results\n`);

    // Step 2: Validate statuses
    const validStatuses = ['APPROVED', 'REJECTED', 'NEEDS_FIX', ''];
    const invalidStatuses = results.filter(
      (r) => r.status && !validStatuses.includes(r.status.toUpperCase())
    );

    if (invalidStatuses.length > 0) {
      console.warn(
        `⚠️  Found ${invalidStatuses.length} invalid statuses (will skip):`
      );
      invalidStatuses.forEach((r) => {
        console.warn(`  - ${r.id}: "${r.status}"`);
      });
      console.log('');
    }

    // Step 3: Apply updates
    console.log('Step 2: Applying updates to database...\n');

    let approved = 0;
    let rejected = 0;
    let needsFix = 0;
    let skipped = 0;

    for (const result of results) {
      const statusUpper = result.status.toUpperCase();

      if (!statusUpper || statusUpper === '') {
        skipped++;
        continue;
      }

      try {
        let newStatus: string;
        let validatedBy = 'manual-qa';
        let validatedAt = new Date();

        switch (statusUpper) {
          case 'APPROVED':
            newStatus = 'publie';
            approved++;
            break;

          case 'REJECTED':
            newStatus = 'archive';
            rejected++;
            break;

          case 'NEEDS_FIX':
            // Keep as draft but mark for attention
            newStatus = 'brouillon';
            needsFix++;
            break;

          default:
            skipped++;
            continue;
        }

        await prisma.question.update({
          where: { id: result.id },
          data: {
            status: newStatus,
            validatedBy,
            validatedAt,
            // Store comments in a custom field or log them
          },
        });

        if ((approved + rejected + needsFix) % 10 === 0) {
          console.log(
            `  Progress: ${approved + rejected + needsFix} questions updated...`
          );
        }
      } catch (error: any) {
        console.error(`  ⚠️  Error updating question ${result.id}:`, error.message);
        skipped++;
      }
    }

    console.log('\n✅ Import complete!\n');

    // Step 4: Display summary
    console.log('📊 Summary:');
    console.log(`   Approved (published): ${approved}`);
    console.log(`   Rejected (archived): ${rejected}`);
    console.log(`   Needs Fix (kept as draft): ${needsFix}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total processed: ${approved + rejected + needsFix}\n`);

    // Step 5: Show updated stats
    const statusCounts = await prisma.question.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('📈 Current Question Status Distribution:');
    statusCounts.forEach((stat) => {
      console.log(`   ${stat.status}: ${stat._count}`);
    });

    const publishedCount = await prisma.question.count({
      where: { status: 'publie' },
    });

    console.log(`\n✅ ${publishedCount} questions ready for production!\n`);

    return {
      approved,
      rejected,
      needsFix,
      skipped,
    };
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await closePrismaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: npx ts-node scripts/qa/import-review-results.ts <csv-file-path>');
    process.exit(1);
  }

  importReviewResults(csvPath)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { importReviewResults };
