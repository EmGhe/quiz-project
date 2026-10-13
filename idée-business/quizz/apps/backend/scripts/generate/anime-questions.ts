import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎌 Generating anime questions...\n');

  const category = await prisma.category.findUnique({
    where: { slug: 'animation-japonaise' },
  });

  if (!category) throw new Error('Category not found');

  const facts = await prisma.fact.findMany({
    where: {
      categoryId: category.id,
      property: { in: ['anime_character_name', 'anime_anime_name'] },
    },
  });

  let created = 0;
  let characterNameNumber = 1;
  let animeNameNumber = 1;

  for (const fact of facts) {
    const character = (fact.data as any)?.character;
    const anime = (fact.data as any)?.anime;
    const role = (fact.data as any)?.role;
    const mediaUrl = (fact.data as any)?.mediaUrl;
    const questionType = (fact.data as any)?.questionType;

    let questionText: string;
    let answer: string;

    if (questionType === 'character_name') {
      questionText = `Quel est le nom de ce personnage de ${anime} ? [${characterNameNumber}]`;
      answer = character;
      characterNameNumber++;
    } else {
      questionText = `De quelle animation japonaise provient ce personnage ? [${animeNameNumber}]`;
      answer = anime;
      animeNameNumber++;
    }

    const existing = await prisma.question.findUnique({
      where: { text: questionText },
    });

    if (existing) continue;

    const question = await prisma.question.create({
      data: {
        text: questionText,
        questionType: 'image',
        mediaUrl,
        difficulty: 'moyen',
        categoryId: category.id,
        factId: fact.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: false,
      },
    });

    // Accepted answer
    const variants = [
      { answer, isPrimary: true, variantType: 'exacte' },
      { answer: answer.toLowerCase(), isPrimary: false, variantType: 'casse' },
    ];

    for (const variant of variants) {
      await prisma.acceptedAnswer.create({
        data: {
          questionId: question.id,
          answer: variant.answer,
          isPrimary: variant.isPrimary,
          variantType: variant.variantType,
          levenshteinThreshold: answer.length <= 5 ? 1 : 2,
        },
      });
    }

    created++;
    console.log(`✅ ${questionText} → ${answer}`);
  }

  console.log(`\n✅ ${created} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
