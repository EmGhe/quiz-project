import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 20 - Sigles (20 questions)
const SIGLES = [
  { sigle: 'NBA', meaning: 'National Basketball Association' },
  { sigle: 'NFL', meaning: 'National Football League' },
  { sigle: 'NHL', meaning: 'National Hockey League' },
  { sigle: 'ONU', meaning: 'Organisation des Nations unies' },
  { sigle: 'OTAN', meaning: 'Organisation du traité de l\'Atlantique Nord' },
  { sigle: 'UNESCO', meaning: 'Organisation des Nations unies pour l\'éducation, la science et la culture' },
  { sigle: 'SNCF', meaning: 'Société nationale des chemins de fer français' },
  { sigle: 'RATP', meaning: 'Régie autonome des transports parisiens' },
  { sigle: 'CGT', meaning: 'Confédération générale du travail' },
  { sigle: 'SMIC', meaning: 'Salaire minimum interprofessionnel de croissance' },
  { sigle: 'PIB', meaning: 'Produit intérieur brut' },
  { sigle: 'PDG', meaning: 'Président-directeur général' },
  { sigle: 'PME', meaning: 'Petite et moyenne entreprise' },
  { sigle: 'TVA', meaning: 'Taxe sur la valeur ajoutée' },
  { sigle: 'HLM', meaning: 'Habitation à loyer modéré' },
  { sigle: 'CAF', meaning: 'Caisse d\'allocations familiales' },
  { sigle: 'RSA', meaning: 'Revenu de solidarité active' },
  { sigle: 'PACS', meaning: 'Pacte civil de solidarité' },
  { sigle: 'EHPAD', meaning: 'Établissement d\'hébergement pour personnes âgées dépendantes' },
  { sigle: 'EDF', meaning: 'Électricité de France' },
];

async function main() {
  console.log('🔤 Ingesting sigles facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Sigles' },
    update: {},
    create: { name: 'Manual - Sigles', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'sigles' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of SIGLES) {
    const existing = await prisma.fact.findFirst({
      where: { subject: item.sigle, property: 'sigle_meaning' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.sigle,
        property: 'sigle_meaning',
        object: item.meaning,
        data: { sigle: item.sigle, meaning: item.meaning },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.sigle} → ${item.meaning}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
