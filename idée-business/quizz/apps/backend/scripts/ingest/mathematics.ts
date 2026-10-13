import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual facts about mathematics
const MATH_FACTS = [
  // Geometric shapes
  { shape: 'Triangle', sides: 3, angles: 3, type: 'polygon' },
  { shape: 'Carré', sides: 4, angles: 4, type: 'polygon' },
  { shape: 'Rectangle', sides: 4, angles: 4, type: 'polygon' },
  { shape: 'Pentagone', sides: 5, angles: 5, type: 'polygon' },
  { shape: 'Hexagone', sides: 6, angles: 6, type: 'polygon' },
  { shape: 'Octogone', sides: 8, angles: 8, type: 'polygon' },
  { shape: 'Cercle', sides: 0, angles: 0, type: 'curve', formula: 'πr²' },

  // Basic arithmetic
  { operation: 'addition', symbol: '+', example: '2 + 2 = 4' },
  { operation: 'soustraction', symbol: '-', example: '5 - 3 = 2' },
  { operation: 'multiplication', symbol: '×', example: '3 × 4 = 12' },
  { operation: 'division', symbol: '÷', example: '10 ÷ 2 = 5' },

  // Numbers
  { concept: 'nombre premier', definition: 'nombre divisible uniquement par 1 et lui-même', examples: [2, 3, 5, 7, 11, 13] },
  { concept: 'nombre pair', definition: 'nombre divisible par 2', examples: [2, 4, 6, 8, 10] },
  { concept: 'nombre impair', definition: 'nombre non divisible par 2', examples: [1, 3, 5, 7, 9] },

  // Constants
  { constant: 'π', name: 'Pi', value: 3.14159, context: 'rapport circonférence/diamètre' },
  { constant: 'e', name: 'nombre d\'Euler', value: 2.71828, context: 'exponentielle' },

  // Formulas
  { formula: 'Aire triangle', equation: '(base × hauteur) / 2' },
  { formula: 'Aire carré', equation: 'côté²' },
  { formula: 'Aire rectangle', equation: 'longueur × largeur' },
  { formula: 'Aire cercle', equation: 'πr²' },
  { formula: 'Périmètre carré', equation: '4 × côté' },
  { formula: 'Périmètre rectangle', equation: '2 × (longueur + largeur)' },
  { formula: 'Circonférence cercle', equation: '2πr' },
  { formula: 'Volume cube', equation: 'côté³' },
  { formula: 'Théorème de Pythagore', equation: 'a² + b² = c²' },
];

async function main() {
  console.log('🔢 Starting mathematics facts ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'sciences-mathematiques' }
  });

  if (!category) {
    throw new Error('Category Sciences - Mathématiques not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-mathematics' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-mathematics',
        url: 'https://en.wikipedia.org/wiki/Mathematics',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const mathFact of MATH_FACTS) {
    // Generate a unique identifier based on the fact content
    const subject = mathFact.shape || mathFact.operation || mathFact.concept || mathFact.constant || mathFact.formula || '';

    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${subject} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    let property = '';
    let object = '';

    if (mathFact.shape) {
      property = 'nombre de côtés';
      object = mathFact.sides?.toString() || '0';
    } else if (mathFact.operation) {
      property = 'symbole';
      object = mathFact.symbol || '';
    } else if (mathFact.concept) {
      property = 'définition';
      object = mathFact.definition || '';
    } else if (mathFact.constant) {
      property = 'valeur';
      object = mathFact.value?.toString() || '';
    } else if (mathFact.formula) {
      property = 'formule';
      object = mathFact.equation || '';
    }

    await prisma.fact.create({
      data: {
        subject,
        property,
        object,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Mathematics',
        data: mathFact,
        interestScore: 5,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${subject}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${MATH_FACTS.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
