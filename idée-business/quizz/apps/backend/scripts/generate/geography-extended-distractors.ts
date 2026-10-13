import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDistractors(question: any, category: any, allFacts: any[]) {
  const distractors: Array<{ text: string; score: number }> = [];
  const correctAnswer = question.acceptedAnswers[0].answer;

  const fact = allFacts.find(f => f.id === question.factId);
  if (!fact) return [];

  const categorySlug = category.slug;

  if (categorySlug === 'geographie-oceans') {
    // For "Quel océan..." questions: use other oceans
    if (question.text.startsWith('Quel océan')) {
      const otherOceans = allFacts
        .filter(f => f.data.type === 'Océan' && f.subject !== correctAnswer)
        .map(f => ({ text: f.subject, score: 85 }));
      distractors.push(...otherOceans);
    }
    // For "Quelle mer borde..." questions: use other seas
    else if (question.text.startsWith('Quelle mer')) {
      const otherSeas = allFacts
        .filter(f => f.data.type === 'Mer' && f.subject !== correctAnswer)
        .map(f => ({ text: f.subject, score: 85 }));
      const shuffled = otherSeas.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
  } else if (categorySlug === 'geographie-rivieres') {
    // For "Dans quel pays coule..." questions: use other countries
    if (question.text.startsWith('Dans quel pays')) {
      const otherCountries = allFacts
        .filter(f => f.data.country && f.data.country !== correctAnswer)
        .map(f => ({ text: f.data.country, score: 80 }));
      const uniqueCountries = Array.from(
        new Map(otherCountries.map(d => [d.text, d])).values()
      );
      const shuffled = uniqueCountries.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
    // For "Quel fleuve traverse..." questions: use other rivers
    else if (question.text.startsWith('Quel fleuve')) {
      const otherRivers = allFacts
        .filter(f => f.subject !== correctAnswer)
        .map(f => ({ text: f.subject, score: 85 }));
      const shuffled = otherRivers.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
    // For "Dans quel océan se jette..." questions: use other oceans/seas
    else if (question.text.includes('océan se jette')) {
      const oceans = ['Atlantique', 'Pacifique', 'Méditerranée', 'Mer du Nord', 'Mer Noire', 'Golfe du Mexique', 'Manche'];
      const otherOceans = oceans.filter(o => o !== correctAnswer);
      distractors.push(...otherOceans.map(o => ({ text: o, score: 80 })).slice(0, 4));
    }
  }

  // Ensure we have exactly 4 unique distractors
  const validDistractors = distractors.filter(d => d.text && d.text.trim() !== '');
  const uniqueDistractors = Array.from(
    new Map(validDistractors.map(d => [d.text, d])).values()
  ).slice(0, 4);

  return uniqueDistractors;
}

async function main() {
  console.log('🎯 Starting geography extended distractors generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['geographie-oceans', 'geographie-rivieres']
      }
    },
    include: {
      facts: true,
      questions: {
        where: { status: 'publie' },
        include: {
          acceptedAnswers: true,
          distractors: true,
        }
      }
    }
  });

  let totalCreated = 0;

  for (const category of categories) {
    console.log(`\n📂 Processing ${category.name} (${category.questions.length} questions)...\n`);

    let categoryCreated = 0;

    for (const question of category.questions) {
      // Skip if already has distractors
      if (question.distractors.length > 0) {
        continue;
      }

      const distractors = await generateDistractors(question, category, category.facts);

      if (distractors.length < 4) {
        console.log(`⚠️  Only ${distractors.length} distractors for: ${question.text}`);
      }

      // Create distractors
      for (let i = 0; i < distractors.length; i++) {
        await prisma.distractor.create({
          data: {
            questionId: question.id,
            distractorText: distractors[i].text,
            plausibilityScore: distractors[i].score,
            order: i + 1,
          }
        });
        categoryCreated++;
      }

      if (distractors.length === 4) {
        console.log(`✅ ${question.text.substring(0, 50)}... → ${distractors.length} distractors`);
      }
    }

    console.log(`\n  Created ${categoryCreated} distractors for ${category.name}`);
    totalCreated += categoryCreated;
  }

  console.log(`\n📊 Total: ${totalCreated} distractors created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
