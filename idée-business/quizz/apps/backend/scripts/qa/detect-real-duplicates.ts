import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Duplicate {
  original: { id: string; text: string };
  duplicates: Array<{ id: string; text: string }>;
}

// Normaliser le texte pour détecter les vrais doublons
function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Enlever les articles "le", "la", "de la", "du", "de"
    .replace(/\b(le|la|de la|du|de l'|l')\b/g, '')
    // Enlever "le livre" ou "le film"
    .replace(/\b(le livre|le film|la chanson)\b/g, '')
    // Enlever tous les guillemets (", ", «, »)
    .replace(/["""«»]/g, '')
    // Enlever les espaces multiples
    .replace(/\s+/g, ' ')
    // Enlever les espaces avant les points d'interrogation
    .replace(/\s+\?/g, '?')
    .trim();
}

async function detectDuplicates() {
  console.log('🔍 Detecting real duplicates...\n');

  const questions = await prisma.question.findMany({
    where: { status: 'publie' },
    select: { id: true, text: true, categoryId: true },
  });

  console.log(`Analyzing ${questions.length} questions...\n`);

  // Grouper par texte normalisé
  const normalizedMap = new Map<string, Array<{ id: string; text: string }>>();

  for (const question of questions) {
    const normalized = normalizeQuestion(question.text);

    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, []);
    }

    normalizedMap.get(normalized)!.push({
      id: question.id,
      text: question.text,
    });
  }

  // Trouver les groupes avec duplicates
  const duplicateGroups: Duplicate[] = [];

  for (const [normalized, group] of normalizedMap.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        original: group[0],
        duplicates: group.slice(1),
      });
    }
  }

  // Trier par nombre de duplicates
  duplicateGroups.sort((a, b) => b.duplicates.length - a.duplicates.length);

  console.log(`✅ Found ${duplicateGroups.length} groups of duplicates\n`);
  console.log('='.repeat(80) + '\n');

  // Afficher les duplicates
  let totalDuplicates = 0;
  const duplicateIds: string[] = [];

  for (const group of duplicateGroups) {
    totalDuplicates += group.duplicates.length;

    console.log(`📝 Group (${group.duplicates.length + 1} questions):`);
    console.log(`   ✓ KEEP: "${group.original.text}"`);

    for (const dup of group.duplicates) {
      console.log(`   ✗ DELETE: "${dup.text}"`);
      duplicateIds.push(dup.id);
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`   Total duplicates to delete: ${totalDuplicates}`);
  console.log(`   Questions after cleanup: ${questions.length - totalDuplicates}\n`);

  // Export liste des IDs à supprimer
  const fs = require('fs');
  const exportData = {
    totalGroups: duplicateGroups.length,
    totalDuplicates,
    duplicateIds,
    groups: duplicateGroups.map(g => ({
      keep: g.original,
      delete: g.duplicates,
    })),
  };

  fs.writeFileSync('exports/duplicates-to-delete.json', JSON.stringify(exportData, null, 2));
  console.log(`📄 Export saved to: exports/duplicates-to-delete.json\n`);

  // Créer le script de suppression
  const deleteScript = `-- SQL Script to delete duplicate questions
-- Generated: ${new Date().toISOString()}
-- Total duplicates to delete: ${totalDuplicates}

BEGIN;

${duplicateIds.map(id => `-- DELETE FROM "Question" WHERE id = '${id}';`).join('\n')}

COMMIT;
`;

  fs.writeFileSync('exports/delete-duplicates.sql', deleteScript);
  console.log(`📄 SQL script saved to: exports/delete-duplicates.sql\n`);

  return { duplicateGroups, duplicateIds };
}

async function deleteDuplicates(duplicateIds: string[]) {
  console.log(`\n🗑️  Deleting ${duplicateIds.length} duplicate questions...\n`);

  let deleted = 0;

  for (const id of duplicateIds) {
    try {
      await prisma.question.delete({
        where: { id },
      });
      deleted++;

      if (deleted % 10 === 0) {
        console.log(`   Deleted ${deleted}/${duplicateIds.length}...`);
      }
    } catch (error) {
      console.error(`   ⚠️  Failed to delete question ${id}:`, error);
    }
  }

  console.log(`\n✅ Deleted ${deleted} duplicate questions`);

  // Vérifier le total restant
  const remaining = await prisma.question.count({ where: { status: 'publie' } });
  console.log(`✅ Remaining published questions: ${remaining}\n`);
}

async function main() {
  console.log('🔍 Real Duplicate Detection Tool\n');
  console.log('='.repeat(80) + '\n');

  const { duplicateGroups, duplicateIds } = await detectDuplicates();

  // Demander confirmation pour supprimer
  console.log('⚠️  To delete these duplicates, run:');
  console.log('   npx tsx scripts/qa/detect-real-duplicates.ts --delete\n');

  // Si flag --delete
  if (process.argv.includes('--delete')) {
    console.log('⚠️  DELETION MODE ENABLED\n');
    await deleteDuplicates(duplicateIds);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
