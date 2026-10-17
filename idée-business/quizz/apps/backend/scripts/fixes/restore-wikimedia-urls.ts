import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Restauration des URLs Wikimedia originales...\n');

  // Get all questions with proxy URLs
  const questions = await prisma.question.findMany({
    where: {
      mediaUrl: { startsWith: '/api/proxy' },
    },
  });

  console.log(`  ${questions.length} questions avec proxy URLs\n`);

  let updated = 0;
  for (const question of questions) {
    if (!question.mediaUrl) continue;

    // Extract original URL from proxy URL
    const match = question.mediaUrl.match(/url=([^&]+)/);
    if (!match) {
      console.log(`  ⚠️  ${question.text} - pas d'URL trouvée`);
      continue;
    }

    const originalUrl = decodeURIComponent(match[1]);

    await prisma.question.update({
      where: { id: question.id },
      data: { mediaUrl: originalUrl },
    });

    updated++;
    console.log(`  ✅ ${question.text.substring(0, 50)}...`);
    console.log(`     ${originalUrl}\n`);
  }

  console.log(`\n✅ ${updated} URLs Wikimedia restaurées !`);
  console.log('   Lancez maintenant: npx tsx scripts/images/download-and-store-all-images.ts');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
