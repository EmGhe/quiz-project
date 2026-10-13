import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating literature question distractors...\n');

  // Get all literature categories
  const literatureCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: 'litterature-'
      }
    }
  });

  console.log(`Found ${literatureCategories.length} literature categories\n`);

  let totalDistractors = 0;

  for (const category of literatureCategories) {
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
        continue;
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
      const selectedDistractors = shuffled.slice(0, 3).map(f => {
        // Prefer author names for \"Qui a écrit\" questions, works for character questions
        if (question.text.includes('Qui a écrit') || question.text.includes('Qui est cet auteur')) {
          return f.subject; // Author name
        } else if (question.text.includes('personnage') || question.text.includes('roman')) {
          return f.object; // Work title
        }
        return f.subject; // Default to author
      });

      // If not enough distractors from same category, add generic ones
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
    'litterature-francaise': [
      'Romain Gary', 'Marguerite Duras', 'André Gide', 'Jules Verne',
      'Pierre Corneille', 'Jean Racine', 'Alphonse Daudet', 'Colette',
      'Louis Aragon', 'Jacques Prévert', 'Boris Vian', 'Georges Perec',
      'La Princesse de Clèves', 'Germinie Lacerteux', 'Le Père Goriot'
    ],
    'litterature-internationale': [
      'Mark Twain', 'Jane Austen', 'Emily Brontë', 'Leo Tolstoy',
      'Virginia Woolf', 'James Joyce', 'Thomas Mann', 'Hermann Hesse',
      'Les Hauts de Hurlevent', 'Anna Karénine', 'Ulysse', 'Moby Dick'
    ],
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
