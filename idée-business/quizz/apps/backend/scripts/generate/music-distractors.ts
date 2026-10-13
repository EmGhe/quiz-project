import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Generating music question distractors...\n');

  // Get all music categories
  const musicCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: 'musique-'
      }
    }
  });

  console.log(`Found ${musicCategories.length} music categories\n`);

  let totalDistractors = 0;

  for (const category of musicCategories) {
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
        // Prefer subject for artist names, object for songs/albums
        if (question.text.includes('artiste') || question.text.includes('groupe') || question.text.includes('chanteur')) {
          return f.subject;
        }
        return f.object;
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
    'musique-artistes-francais': [
      'Johnny Hallyday', 'Mylène Farmer', 'Patricia Kaas', 'Céline Dion',
      'Michel Sardou', 'Vanessa Paradis', 'Julien Doré', 'M (Matthieu Chedid)',
      'Zazie', 'Benjamin Biolay', 'Christophe Maé', 'Patrick Bruel'
    ],
    'musique-artistes-internationaux': [
      'Taylor Swift', 'Drake', 'Bruno Mars', 'Ariana Grande',
      'The Weeknd', 'Justin Bieber', 'Katy Perry', 'Maroon 5',
      'U2', 'AC/DC', 'Metallica', 'Red Hot Chili Peppers'
    ],
    'musique-albums': [
      'Rumours', 'The Wall', 'Born to Run', 'Purple Rain',
      'Led Zeppelin IV', 'The Joshua Tree', 'Hotel California'
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
