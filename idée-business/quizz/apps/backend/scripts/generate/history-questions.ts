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

// Templates for historical events
const EVENT_TEMPLATES = [
  {
    template: 'En quelle année a eu lieu {event} ?',
    answerField: 'year',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.year && !fact.data.yearStart,
  },
  {
    template: 'Quel événement a eu lieu en {year} ?',
    answerField: 'event',
    difficulty: 'difficile',
    filter: (fact: any) => fact.data.year && !fact.data.yearStart,
  },
  {
    template: 'Qui a découvert {subject} ?',
    answerField: 'discoverer',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.discoverer,
  },
];

// Templates for historical figures
const FIGURE_TEMPLATES = [
  {
    template: 'Qui était {name} ?',
    answerField: 'title',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.title,
  },
  {
    template: 'Quel était le surnom de {name} ?',
    answerField: 'nickname',
    difficulty: 'difficile',
    filter: (fact: any) => fact.data.nickname,
  },
  {
    template: 'Qui a peint {work} ?',
    answerField: 'name',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.field === 'Peinture' && fact.data.famousFor,
    workGetter: (fact: any) => fact.data.famousFor,
  },
  {
    template: 'Qui a écrit {work} ?',
    answerField: 'name',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.field === 'Littérature' && fact.data.famousFor,
    workGetter: (fact: any) => fact.data.famousFor,
  },
  {
    template: 'Qui a composé {work} ?',
    answerField: 'name',
    difficulty: 'moyen',
    filter: (fact: any) => fact.data.field === 'Musique' && fact.data.famousFor,
    workGetter: (fact: any) => fact.data.famousFor,
  },
  {
    template: 'Dans quel domaine {name} était-il/elle célèbre ?',
    answerField: 'field',
    difficulty: 'facile',
    filter: (fact: any) => fact.data.field,
  },
];

function interpolateTemplate(template: string, data: any): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key === 'work' && data._work) {
      return data._work;
    }
    if (key === 'subject' && data.event) {
      return data.event.replace('Découverte de l\'', '').replace('Découverte de ', '').replace('Découverte du ', '');
    }
    return data[key] || match;
  });
}

async function main() {
  console.log('📚 Starting history questions generation...\n');

  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['histoire-evenements', 'histoire-personnages']
      }
    },
    include: {
      facts: true,
    }
  });

  let totalCreated = 0;

  for (const category of categories) {
    const isEvents = category.slug === 'histoire-evenements';
    const templates = isEvents ? EVENT_TEMPLATES : FIGURE_TEMPLATES;

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
        if (template.answerField === 'year' && fact.data.year) {
          answer = fact.data.year.toString();
        } else if (template.answerField === 'event') {
          answer = fact.subject;
        } else if (template.answerField === 'name') {
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
        const workGetter = (template as any).workGetter;
        const templateData = {
          ...fact.data,
          name: fact.subject,
          event: fact.subject,
          subject: fact.subject,
          year: fact.data.year,
          _work: workGetter ? workGetter(fact) : undefined,
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
