import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating sports question distractors...\n');

  // Get all sports categories
  const sportsCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: 'sports-'
      }
    }
  });

  console.log(`Found ${sportsCategories.length} sports categories\n`);

  let totalDistractors = 0;

  for (const category of sportsCategories) {
    console.log(`Processing ${category.name}...`);

    // Get all questions for this category
    const questions = await prisma.question.findMany({
      where: {
        categoryId: category.id,
      },
      include: {
        acceptedAnswers: true,
        fact: true,
      },
    });

    if (questions.length === 0) {
      console.log(`  No questions found`);
      continue;
    }

    // Get all facts from this category for distractor pool
    const allFacts = await prisma.fact.findMany({
      where: {
        categoryId: category.id,
      },
    });

    for (const question of questions) {
      const correctAnswer = question.acceptedAnswers[0]?.answer;
      if (!correctAnswer) continue;

      // Check if distractors already exist
      const existingDistractors = await prisma.distractor.count({
        where: { questionId: question.id }
      });
      if (existingDistractors > 0) {
        continue; // Skip if distractors already exist
      }

      // Get potential distractors (exclude correct answer)
      const potentialDistractors = allFacts
        .filter(f => {
          // Exclude the fact used for this question
          if (f.id === question.factId) return false;

          // Check if the fact's subject or object matches the correct answer
          const factValues = [f.subject, f.object].map(v => v.toLowerCase());
          const correctLower = correctAnswer.toLowerCase();

          return !factValues.some(v =>
            v === correctLower ||
            correctLower.includes(v) ||
            v.includes(correctLower)
          );
        });

      // Select 3 random distractors
      const shuffled = potentialDistractors.sort(() => Math.random() - 0.5);
      const selectedDistractors = shuffled.slice(0, 3).map(f => f.subject);

      // If not enough distractors from same category, add generic ones based on category
      while (selectedDistractors.length < 3) {
        const generic = getGenericDistractor(category.slug, selectedDistractors, correctAnswer);
        if (generic && !selectedDistractors.includes(generic)) {
          selectedDistractors.push(generic);
        } else {
          break;
        }
      }

      // Create distractors
      for (let i = 0; i < selectedDistractors.length; i++) {
        await prisma.distractor.create({
          data: {
            questionId: question.id,
            distractorText: selectedDistractors[i],
            order: i + 1,
          },
        });
        totalDistractors++;
      }
    }

    console.log(`  ✅ ${questions.length} questions processed`);
  }

  console.log(`\n✅ Generated ${totalDistractors} distractors`);
}

function getGenericDistractor(categorySlug: string, existingDistractors: string[], correctAnswer: string): string | null {
  const genericDistractors: Record<string, string[]> = {
    'sports-football': ['Real Madrid', 'Bayern Munich', 'Liverpool', 'Juventus', 'AC Milan', 'Chelsea'],
    'sports-tennis': ['Novak Djokovic', 'Andy Murray', 'Stan Wawrinka', 'Marin Cilic', 'Pete Sampras'],
    'sports-nba': ['Golden State Warriors', 'Miami Heat', 'Chicago Bulls', 'Brooklyn Nets', 'Phoenix Suns'],
    'sports-rugby': ['Afrique du Sud', 'Australie', 'Argentine', 'Pays de Galles', 'Irlande'],
    'sports-ufc': ['Jon Jones', 'Israel Adesanya', 'Francis Ngannou', 'Georges St-Pierre'],
    'sports-handball': ['Espagne', 'Allemagne', 'Danemark', 'Suède', 'Norvège'],
    'sports-ultra-trail': ['Courtney Dauwalter', 'Jim Walmsley', 'Xavier Thévenard', 'Ludovic Pommeret'],
    'sports-f1': ['Michael Schumacher', 'Ayrton Senna', 'Alain Prost', 'Sebastian Vettel', 'Fernando Alonso'],
  };

  const pool = genericDistractors[categorySlug] || [];
  const available = pool.filter(d =>
    !existingDistractors.includes(d) &&
    d.toLowerCase() !== correctAnswer.toLowerCase()
  );

  return available.length > 0 ? available[0] : null;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
