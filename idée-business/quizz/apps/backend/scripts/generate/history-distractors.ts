import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDistractors(question: any, category: any, allFacts: any[]) {
  const distractors: Array<{ text: string; score: number }> = [];
  const correctAnswer = question.acceptedAnswers[0].answer;

  const fact = allFacts.find(f => f.id === question.factId);
  if (!fact) return [];

  const categorySlug = category.slug;

  if (categorySlug === 'histoire-evenements') {
    // For year questions: use nearby years
    if (question.text.startsWith('En quelle année')) {
      const year = parseInt(correctAnswer);
      if (!isNaN(year)) {
        const nearbyYears = [
          year - 5,
          year - 2,
          year + 3,
          year + 7,
        ];
        distractors.push(...nearbyYears.map(y => ({ text: y.toString(), score: 85 })));
      }
    }
    // For "Quel événement..." questions: use other events from same period
    else if (question.text.startsWith('Quel événement')) {
      const otherEvents = allFacts
        .filter(f => f.subject !== correctAnswer && f.data.event)
        .map(f => ({ text: f.subject, score: 80 }));
      const shuffled = otherEvents.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
    // For "Qui a découvert..." questions: use other explorers/discoverers
    else if (question.text.startsWith('Qui a découvert')) {
      const explorers = ['Christophe Colomb', 'Vasco de Gama', 'Jacques Cartier', 'Magellan', 'James Cook'];
      const otherExplorers = explorers.filter(e => e !== correctAnswer);
      distractors.push(...otherExplorers.map(e => ({ text: e, score: 85 })).slice(0, 4));
    }
  } else if (categorySlug === 'histoire-personnages') {
    // For "Qui était..." questions: use titles from other people
    if (question.text.startsWith('Qui était')) {
      const otherTitles = allFacts
        .filter(f => f.data.title && f.data.title !== correctAnswer && f.subject !== correctAnswer)
        .map(f => ({ text: f.data.title, score: 80 }));
      const shuffled = otherTitles.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
    // For "Quel était le surnom..." questions: use other nicknames
    else if (question.text.includes('surnom')) {
      const nicknames = ['Le Grand', 'Le Sage', 'Le Bien-Aimé', 'Le Conquérant', 'Le Magnifique'];
      const otherNicknames = nicknames.filter(n => n !== correctAnswer);
      distractors.push(...otherNicknames.map(n => ({ text: n, score: 75 })).slice(0, 4));
    }
    // For "Qui a peint/écrit/composé..." questions: use other artists
    else if (question.text.includes('peint') || question.text.includes('écrit') || question.text.includes('composé')) {
      const otherArtists = allFacts
        .filter(f => f.subject !== correctAnswer && (f.data.field === fact.data.field))
        .map(f => ({ text: f.subject, score: 85 }));
      const shuffled = otherArtists.sort(() => Math.random() - 0.5);
      distractors.push(...shuffled.slice(0, 4));
    }
    // For "Dans quel domaine..." questions: use other fields
    else if (question.text.includes('domaine')) {
      const fields = ['Peinture', 'Littérature', 'Musique', 'Philosophie', 'Sciences', 'Astronomie', 'Physique'];
      const otherFields = fields.filter(f => f !== correctAnswer);
      distractors.push(...otherFields.map(f => ({ text: f, score: 80 })).slice(0, 4));
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
  console.log('🎯 Starting history distractors generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['histoire-evenements', 'histoire-personnages']
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
