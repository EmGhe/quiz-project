import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Distractors supplémentaires par catégorie
const extraDistractors: Record<string, string[]> = {
  cinema: [
    'Karin Viard',
    'Juliette Binoche',
    'Audrey Tautou',
    'Romain Duris',
    'Vincent Lindon',
    'Mathieu Amalric',
    'Gaspard Ulliel',
    'Tahar Rahim',
    'François Cluzet',
    'Benoît Magimel',
  ],
  litterature: [
    'Jean-Paul Sartre',
    'Simone de Beauvoir',
    'Marguerite Duras',
    'Louis-Ferdinand Céline',
    'André Gide',
    'François Mauriac',
    'Romain Gary',
    'Michel Tournier',
  ],
  sport: [
    'Platini',
    'Cantona',
    'Ribéry',
    'Benzema',
    'Giroud',
    'Papin',
    'Trezeguet',
    'Drogba',
    'Zola',
  ],
  histoire: [
    '1815',
    '1848',
    'Louis XV',
    'Henri IV',
    'Charlemagne',
    'Clovis',
    'Philippe Auguste',
  ],
  geographie: [
    'Oslo',
    'Helsinki',
    'Stockholm',
    'Copenhague',
    'Reykjavik',
    'Dublin',
    'Athènes',
    'Lisbonne',
    'Bruxelles',
    'Amsterdam',
    'Vienne',
    'Prague',
  ],
};

async function main() {
  console.log('🔧 Ajout du 4ème distractor aux questions...\n');

  // Get all questions with exactly 3 distractors
  const questions = await prisma.question.findMany({
    where: {
      status: 'publie',
      enabledForMcq: true,
    },
    include: {
      distractors: true,
      category: true,
      acceptedAnswers: true,
    },
  });

  const questionsNeedingDistractor = questions.filter((q) => q.distractors.length === 3);

  console.log(`  ${questionsNeedingDistractor.length} questions avec 3 distractors\n`);

  let added = 0;
  for (const question of questionsNeedingDistractor) {
    const categorySlug = question.category?.slug || 'geographie';
    const pool = extraDistractors[categorySlug] || extraDistractors.geographie;

    // Get existing distractors + correct answer
    const existing = [
      ...question.distractors.map((d) => d.distractorText.toLowerCase()),
      ...question.acceptedAnswers.map((a) => a.answer.toLowerCase()),
    ];

    // Find a distractor that doesn't exist yet
    const newDistractor = pool.find((d) => !existing.includes(d.toLowerCase()));

    if (newDistractor) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: newDistractor,
          order: 4,
          plausibilityScore: 75,
        },
      });

      added++;
      console.log(`  ✅ ${question.text.substring(0, 50)}... + "${newDistractor}"`);
    } else {
      console.log(`  ⚠️  ${question.text.substring(0, 50)}... (pas de distractor disponible)`);
    }
  }

  console.log(`\n✅ ${added} distractors ajoutés !`);
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
