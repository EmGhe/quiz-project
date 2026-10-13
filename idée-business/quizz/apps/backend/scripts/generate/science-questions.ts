import { PrismaClient } from '@prisma/client';
import { getLevenshteinThreshold } from '../utils/question-templates';

const prisma = new PrismaClient();

// Question templates for each science domain
const TEMPLATES = {
  astronomie: [
    {
      template: 'Quelle est la {order}ème planète du système solaire ?',
      answerField: 'planetNameFr',
      difficulty: 'moyen',
      difficultyScore: 50,
    },
    {
      template: 'Combien de planètes y a-t-il dans le système solaire ?',
      answerField: 'static:8',
      difficulty: 'facile',
      difficultyScore: 20,
    },
  ],
  chimie: [
    {
      template: 'Quel est le symbole chimique de {elementNameFr} ?',
      answerField: 'symbol',
      difficulty: 'moyen',
      difficultyScore: 45,
    },
    {
      template: 'Quel élément chimique a pour symbole {symbol} ?',
      answerField: 'elementNameFr',
      difficulty: 'difficile',
      difficultyScore: 60,
    },
  ],
  anatomie: [
    {
      template: 'Où se trouve {organ} ?',
      answerField: 'location',
      difficulty: 'moyen',
      difficultyScore: 50,
      filter: (fact: any) => !!fact.data.location,
    },
    {
      template: 'Quel organe permet de {function} ?',
      answerField: 'organ',
      difficulty: 'facile',
      difficultyScore: 30,
      filter: (fact: any) => !!fact.data.function,
    },
  ],
  mathematiques: [
    {
      template: 'Combien de côtés a un {shape} ?',
      answerField: 'sides',
      difficulty: 'facile',
      difficultyScore: 20,
      filter: (fact: any) => !!fact.data.shape && fact.data.sides !== undefined,
    },
    {
      template: 'Quelle est la formule de {formula} ?',
      answerField: 'equation',
      difficulty: 'moyen',
      difficultyScore: 50,
      filter: (fact: any) => !!fact.data.formula,
    },
  ],
};

function interpolateTemplate(template: string, data: any): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
}

function generateAnswerVariants(answer: string): string[] {
  const variants = [answer];

  // Common variations
  const normalized = answer.toLowerCase();
  if (normalized !== answer) variants.push(normalized);

  // Remove articles
  const withoutArticles = answer.replace(/^(le |la |l'|les )/i, '');
  if (withoutArticles !== answer) variants.push(withoutArticles);

  return [...new Set(variants)];
}

async function main() {
  console.log('🔬 Starting science questions generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['sciences-astronomie', 'sciences-chimie', 'sciences-anatomie', 'sciences-mathematiques']
      }
    },
    include: {
      facts: true,
    }
  });

  let totalCreated = 0;

  for (const category of categories) {
    const categorySlug = category.slug.replace('sciences-', '');
    const templates = TEMPLATES[categorySlug as keyof typeof TEMPLATES];

    if (!templates) {
      console.log(`⏭️  No templates for ${category.name}`);
      continue;
    }

    console.log(`\n📂 Processing ${category.name} (${category.facts.length} facts)...\n`);

    let categoryCreated = 0;

    for (const fact of category.facts) {
      for (const template of templates) {
        // Apply filter if exists
        if (template.filter && !template.filter(fact)) {
          continue;
        }

        // Get answer
        let answer: string;
        if (template.answerField.startsWith('static:')) {
          answer = template.answerField.split(':')[1];
        } else {
          answer = fact.data[template.answerField] || fact[template.answerField as keyof typeof fact];
        }

        if (!answer) continue;

        // Convert to string if number
        if (typeof answer === 'number') {
          answer = answer.toString();
        }

        // Interpolate question text
        const questionText = interpolateTemplate(template.template, {
          ...fact.data,
          ...fact,
        });

        // Check if question already exists
        const existing = await prisma.question.findFirst({
          where: {
            text: questionText,
          }
        });

        if (existing) {
          continue;
        }

        // Create question
        const question = await prisma.question.create({
          data: {
            text: questionText,
            difficulty: template.difficulty,
            categoryId: category.id,
            factId: fact.id,
            status: 'publie',
            qualityScore: 80 + fact.interestScore!,
          }
        });

        // Create accepted answers
        const variants = generateAnswerVariants(answer);
        for (let i = 0; i < variants.length; i++) {
          await prisma.acceptedAnswer.create({
            data: {
              questionId: question.id,
              answer: variants[i],
              isPrimary: i === 0,
              variantType: i === 0 ? 'canonical' : 'alternative',
              levenshteinThreshold: getLevenshteinThreshold(variants[i]),
            }
          });
        }

        categoryCreated++;
        console.log(`✅ ${questionText} → ${answer}`);
      }
    }

    console.log(`\n  Created ${categoryCreated} questions for ${category.name}`);
    totalCreated += categoryCreated;
  }

  console.log(`\n📊 Total: ${totalCreated} questions created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
