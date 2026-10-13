import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎵 Generating music songs questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'musique-artistes-francais' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: { categoryId: category.id, property: 'music_artist' },
  });

  let created = 0;

  for (const fact of facts) {
    const song = (fact.data as any)?.song;
    const artist = (fact.data as any)?.artist;

    const questionText = `Qui a chanté "${song}" ?`;

    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) continue;

    const question = await prisma.question.create({
      data: {
        text: questionText,
        difficulty: 'moyen',
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: false,
      },
    });

    // Accepted answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: artist,
        isPrimary: true,
        variantType: 'exacte',
        levenshteinThreshold: 2,
      },
    });

    created++;
    console.log(`✅ ${questionText} → ${artist}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
