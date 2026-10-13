/**
 * Database utilities for ingestion scripts
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

/**
 * Close Prisma connection
 */
export async function closePrismaConnection(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Ensure required categories exist
 */
export async function ensureCategoriesExist() {
  const client = getPrismaClient();

  const categories = [
    { name: 'Géographie', slug: 'geographie', description: 'Pays, capitales, villes, monuments, etc.' },
    { name: 'Histoire', slug: 'histoire', description: 'Événements historiques, personnages, civilisations' },
    { name: 'Sciences', slug: 'sciences', description: 'Physique, chimie, biologie, astronomie' },
    { name: 'Sports', slug: 'sports', description: 'Football, tennis, JO, records sportifs' },
    { name: 'Cinéma', slug: 'cinema', description: 'Films, acteurs, réalisateurs' },
    { name: 'Musique', slug: 'musique', description: 'Artistes, chansons, albums' },
    { name: 'Littérature', slug: 'litterature', description: 'Auteurs, œuvres, personnages' },
    { name: 'Gastronomie', slug: 'gastronomie', description: 'Cuisine, spécialités, ingrédients' },
    { name: 'Culture Générale', slug: 'culture-generale', description: 'Connaissances générales variées' },
  ];

  for (const category of categories) {
    await client.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log('✓ Categories ensured');
}

/**
 * Ensure Wikidata source exists
 */
export async function ensureWikidataSource() {
  const client = getPrismaClient();

  const source = await client.source.upsert({
    where: { name: 'Wikidata' },
    update: {},
    create: {
      name: 'Wikidata',
      type: 'wikidata',
      url: 'https://www.wikidata.org',
      reliability: 5,
      description: 'Base de connaissances collaborative multilingue',
    },
  });

  console.log('✓ Wikidata source ensured');
  return source;
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string) {
  const client = getPrismaClient();
  return client.category.findUnique({
    where: { slug },
  });
}
