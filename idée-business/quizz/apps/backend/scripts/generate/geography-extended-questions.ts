import { PrismaClient } from '@prisma/client';
import { getLevenshteinThreshold } from '../utils/question-templates';

const prisma = new PrismaClient();

function generateAnswerVariants(answer: string): string[] {
  const variants = [answer];

  // Common variations
  const normalized = answer.toLowerCase();
  if (normalized !== answer) variants.push(normalized);

  // Remove articles
  const withoutArticles = answer.replace(/^(le |la |l'|les |un |une |des )/i, '');
  if (withoutArticles !== answer) variants.push(withoutArticles);

  return [...new Set(variants)];
}

// Templates for oceans/seas
const OCEAN_TEMPLATES = [
  {
    template: 'Quel océan se trouve entre {location} ?',
    answerField: 'name',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.type === 'Océan' && fact.data.location,
    locationGetter: (fact: any) => fact.data.location,
  },
  {
    template: 'Quelle mer borde {country} ?',
    answerField: 'name',
    difficulty: 'difficile',
    filter: (fact: any) => fact.data.type === 'Mer' && fact.data.bordeCountries && fact.data.bordeCountries.length > 0,
    countryGetter: (fact: any) => fact.data.bordeCountries[0],
  },
];

// Templates for rivers
const RIVER_TEMPLATES = [
  {
    template: 'Dans quel pays coule {river} ?',
    answerField: 'country',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.country,
  },
  {
    template: 'Quel fleuve traverse {city} ?',
    answerField: 'name',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.flows,
    cityGetter: (fact: any) => fact.data.flows,
  },
  {
    template: 'Dans quel océan se jette {river} ?',
    answerField: 'ocean',
    difficulty: 'difficile',
    filter: (fact: any) => fact.data.ocean,
  },
];

function interpolateTemplate(template: string, data: any): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
}

async function main() {
  console.log('🗺️  Starting geography extended questions generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['geographie-oceans', 'geographie-rivieres']
      }
    },
    include: {
      facts: true,
    }
  });

  let totalCreated = 0;

  for (const category of categories) {
    const isOceans = category.slug === 'geographie-oceans';
    const templates = isOceans ? OCEAN_TEMPLATES : RIVER_TEMPLATES;

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
        if (template.answerField === 'name') {
          answer = fact.subject;
        } else {
          answer = fact.data[template.answerField];
        }

        if (!answer) continue;

        // Convert to string if number
        if (typeof answer === 'number') {
          answer = answer.toString();
        }

        // Interpolate question text
        const locationGetter = (template as any).locationGetter;
        const countryGetter = (template as any).countryGetter;
        const cityGetter = (template as any).cityGetter;

        const templateData = {
          ...fact.data,
          name: fact.subject,
          river: fact.subject,
          location: locationGetter ? locationGetter(fact) : undefined,
          country: countryGetter ? countryGetter(fact) : undefined,
          city: cityGetter ? cityGetter(fact) : undefined,
        };

        const questionText = interpolateTemplate(template.template, templateData);

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
            qualityScore: 80 + (fact.interestScore || 7),
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
