import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDistractors(question: any, category: any, allFacts: any[]) {
  const distractors: Array<{ text: string; score: number }> = [];
  const correctAnswer = question.acceptedAnswers[0].answer;

  // Get the fact data
  const fact = allFacts.find(f => f.id === question.factId);
  if (!fact) return [];

  const categorySlug = category.slug.replace('sciences-', '');

  switch (categorySlug) {
    case 'astronomie':
      // For planets: use other planets as distractors
      if (question.text.includes('planète du système solaire')) {
        const otherPlanets = allFacts
          .filter(f => f.data.planetNameFr && f.data.planetNameFr !== correctAnswer)
          .map(f => ({ text: f.data.planetNameFr, score: 90 }));
        distractors.push(...otherPlanets.slice(0, 4));
      } else if (question.text.includes('Combien de planètes')) {
        distractors.push(
          { text: '7', score: 80 },
          { text: '9', score: 85 },
          { text: '10', score: 75 },
          { text: '12', score: 70 }
        );
      }
      break;

    case 'chimie':
      // For chemical elements: use other elements as distractors
      const isElementNameQuestion = question.text.startsWith('Quel élément');
      const isSymbolQuestion = question.text.startsWith('Quel est le symbole');

      if (isElementNameQuestion || isSymbolQuestion) {
        const otherElements = allFacts
          .filter(f => {
            if (isElementNameQuestion) {
              // Question asks for element name, distract with other elements
              return f.data.elementNameFr && f.data.elementNameFr !== correctAnswer;
            } else {
              // Question asks for symbol, distract with other symbols
              return f.data.symbol && f.data.symbol !== correctAnswer;
            }
          })
          .map(f => ({
            text: isElementNameQuestion ? f.data.elementNameFr : f.data.symbol,
            score: 85
          }));

        // Shuffle and take 4
        const shuffled = otherElements.sort(() => Math.random() - 0.5);
        distractors.push(...shuffled.slice(0, 4));
      }
      break;

    case 'anatomie':
      if (question.text.includes('Où se trouve')) {
        // Location questions: use other locations
        const locations = ['thorax', 'abdomen', 'crâne', 'bassin', 'corps entier', 'membres'];
        const otherLocations = locations
          .filter(loc => loc !== correctAnswer)
          .map(loc => ({ text: loc, score: 80 }));
        distractors.push(...otherLocations.slice(0, 4));
      } else if (question.text.includes('Quel organe permet')) {
        // Organ questions: use other organs
        const otherOrgans = allFacts
          .filter(f => f.data.organ && f.data.organ !== correctAnswer)
          .map(f => ({ text: f.data.organ, score: 85 }));
        const shuffled = otherOrgans.sort(() => Math.random() - 0.5);
        distractors.push(...shuffled.slice(0, 4));
      }
      break;

    case 'mathematiques':
      if (question.text.includes('Combien de côtés')) {
        // Shape sides: use other numbers
        const numbers = ['3', '4', '5', '6', '7', '8', '10', '12'];
        const otherNumbers = numbers
          .filter(n => n !== correctAnswer)
          .map(n => ({ text: n, score: 80 }));
        distractors.push(...otherNumbers.slice(0, 4));
      } else if (question.text.includes('formule')) {
        // Formulas: use other formulas
        const otherFormulas = allFacts
          .filter(f => f.data.formula && f.data.equation && f.data.equation !== correctAnswer)
          .map(f => ({ text: f.data.equation, score: 85 }));
        const shuffled = otherFormulas.sort(() => Math.random() - 0.5);
        distractors.push(...shuffled.slice(0, 4));
      }
      break;
  }

  // Ensure we have exactly 4 unique distractors and filter out undefined/empty
  const validDistractors = distractors.filter(d => d.text && d.text.trim() !== '');
  const uniqueDistractors = Array.from(
    new Map(validDistractors.map(d => [d.text, d])).values()
  ).slice(0, 4);

  return uniqueDistractors;
}

async function main() {
  console.log('🎯 Starting science distractors generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['sciences-astronomie', 'sciences-chimie', 'sciences-anatomie', 'sciences-mathematiques']
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
