import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Historical figures
const HISTORICAL_FIGURES = [
  // French Kings
  { name: 'Louis XIV', title: 'Roi de France', nickname: 'Roi Soleil', reign: '1643-1715', famousFor: 'Château de Versailles' },
  { name: 'Louis XVI', title: 'Roi de France', reign: '1774-1792', famousFor: 'Guillotiné pendant la Révolution' },
  { name: 'Henri IV', title: 'Roi de France', nickname: 'Le Bon Roi Henri', reign: '1589-1610', famousFor: 'Édit de Nantes' },
  { name: 'Charlemagne', title: 'Empereur', reign: '768-814', famousFor: 'Empire carolingien' },

  // French Presidents
  { name: 'Charles de Gaulle', title: 'Président français', role: 'Général et président', period: '1958-1969', famousFor: 'Résistance et Ve République' },
  { name: 'François Mitterrand', title: 'Président français', period: '1981-1995', famousFor: 'Plus long mandat présidentiel' },
  { name: 'Jacques Chirac', title: 'Président français', period: '1995-2007' },

  // Military & Political Leaders
  { name: 'Napoléon Bonaparte', title: 'Empereur', reign: '1804-1815', famousFor: 'Empire français et guerres napoléoniennes' },
  { name: 'Jeanne d\'Arc', title: 'Héroïne française', period: '1412-1431', famousFor: 'Libération d\'Orléans' },
  { name: 'Jules César', title: 'Général romain', period: '-100 à -44', famousFor: 'Conquête de la Gaule' },
  { name: 'Vercingétorix', title: 'Chef gaulois', period: '-82 à -46', famousFor: 'Résistance à César' },

  // Scientists
  { name: 'Louis Pasteur', title: 'Scientifique', field: 'Microbiologie', famousFor: 'Vaccin contre la rage' },
  { name: 'Marie Curie', title: 'Scientifique', field: 'Physique', famousFor: 'Découverte du radium', nobelPrizes: 2 },
  { name: 'Albert Einstein', title: 'Physicien', field: 'Physique', famousFor: 'Théorie de la relativité' },
  { name: 'Isaac Newton', title: 'Physicien', field: 'Physique', famousFor: 'Loi de la gravitation' },
  { name: 'Galilée', title: 'Astronome', field: 'Astronomie', famousFor: 'Observation des planètes' },

  // Writers
  { name: 'Victor Hugo', title: 'Écrivain', field: 'Littérature', famousFor: 'Les Misérables', period: '1802-1885' },
  { name: 'Molière', title: 'Dramaturge', field: 'Théâtre', famousFor: 'Le Malade imaginaire', period: '1622-1673' },
  { name: 'Voltaire', title: 'Philosophe', field: 'Philosophie', famousFor: 'Candide', period: '1694-1778' },
  { name: 'Jean-Jacques Rousseau', title: 'Philosophe', field: 'Philosophie', famousFor: 'Le Contrat social', period: '1712-1778' },
  { name: 'Alexandre Dumas', title: 'Écrivain', field: 'Littérature', famousFor: 'Les Trois Mousquetaires', period: '1802-1870' },

  // Artists
  { name: 'Léonard de Vinci', title: 'Artiste', field: 'Peinture', famousFor: 'La Joconde', period: '1452-1519' },
  { name: 'Pablo Picasso', title: 'Peintre', field: 'Peinture', famousFor: 'Cubisme', period: '1881-1973' },
  { name: 'Claude Monet', title: 'Peintre', field: 'Peinture', famousFor: 'Impressionnisme', period: '1840-1926' },
  { name: 'Vincent van Gogh', title: 'Peintre', field: 'Peinture', famousFor: 'La Nuit étoilée', period: '1853-1890' },

  // Composers
  { name: 'Wolfgang Amadeus Mozart', title: 'Compositeur', field: 'Musique', famousFor: 'Requiem', period: '1756-1791' },
  { name: 'Ludwig van Beethoven', title: 'Compositeur', field: 'Musique', famousFor: 'Symphonie n°9', period: '1770-1827' },

  // Explorers
  { name: 'Christophe Colomb', title: 'Navigateur', famousFor: 'Découverte de l\'Amérique', year: 1492 },
  { name: 'Jacques Cartier', title: 'Explorateur', famousFor: 'Exploration du Canada', period: '1491-1557' },
  { name: 'Vasco de Gama', title: 'Navigateur', famousFor: 'Route des Indes', period: '1469-1524' },

  // World Leaders
  { name: 'Winston Churchill', title: 'Premier ministre britannique', period: '1940-1945', famousFor: 'Seconde Guerre mondiale' },
  { name: 'Franklin D. Roosevelt', title: 'Président américain', period: '1933-1945', famousFor: 'New Deal' },
  { name: 'Nelson Mandela', title: 'Président sud-africain', period: '1994-1999', famousFor: 'Lutte contre l\'apartheid' },
];

async function main() {
  console.log('👤 Starting historical figures ingestion...\n');

  // Get category
  const category = await prisma.category.findUnique({
    where: { slug: 'histoire-personnages' }
  });

  if (!category) {
    throw new Error('Category Histoire - Personnages not found');
  }

  // Get or create source
  let source = await prisma.source.findUnique({
    where: { name: 'manual-history-figures' }
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: 'manual-history-figures',
        url: 'https://fr.wikipedia.org/wiki/Personnalité_historique',
        type: 'manual',
      }
    });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const figure of HISTORICAL_FIGURES) {
    // Check if fact already exists
    const existing = await prisma.fact.findFirst({
      where: {
        categoryId: category.id,
        subject: figure.name,
      }
    });

    if (existing) {
      skippedCount++;
      console.log(`⏭️  Skipped: ${figure.name} (already exists)`);
      continue;
    }

    // Create fact (RDF structure)
    await prisma.fact.create({
      data: {
        subject: figure.name,
        property: 'titre',
        object: figure.title,
        categoryId: category.id,
        sourceId: source.id,
        sourceReference: 'Historical Figures',
        data: figure,
        interestScore: 7,
      }
    });

    createdCount++;
    console.log(`✅ Created: ${figure.name} (${figure.title})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${HISTORICAL_FIGURES.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
