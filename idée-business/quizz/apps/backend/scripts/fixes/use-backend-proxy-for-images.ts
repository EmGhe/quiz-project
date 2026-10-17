import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Mise à jour des URLs d\'images pour utiliser le proxy backend...\n');

  // Get all questions with Wikimedia URLs
  const questions = await prisma.question.findMany({
    where: {
      mediaUrl: {
        startsWith: 'https://upload.wikimedia.org',
      },
    },
  });

  console.log(`  Trouvé ${questions.length} questions avec URLs Wikimedia\n`);

  let updated = 0;
  for (const question of questions) {
    if (!question.mediaUrl) continue;

    const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(question.mediaUrl)}`;

    await prisma.question.update({
      where: { id: question.id },
      data: { mediaUrl: proxyUrl },
    });

    updated++;
    console.log(`  ✅ ${question.text.substring(0, 50)}... → Proxy`);
  }

  console.log(`\n✅ ${updated} questions mises à jour !`);
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
