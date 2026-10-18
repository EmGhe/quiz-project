import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const sharp = require('sharp');

const prisma = new PrismaClient();

// Images identifiées comme incorrectes (voir IMAGES-ISSUES-REPORT.md)
const BAD_IMAGES = [
  {
    wikidataId: 'Q517',
    label: 'Napoléon Bonaparte',
    reason: 'Image bleue (test image)',
    hash: '55e15d5de3884e042d30999d78c9acc6'
  },
  {
    wikidataId: 'Q7374',
    label: 'Victor Hugo',
    reason: 'Photo d\'Alfred Hitchcock (mauvaise entité)',
    hash: '89bcfa947efaaaeedae1c7598a63398f'
  },
  {
    wikidataId: 'Q106221',
    label: 'Alain Delon',
    reason: 'Photo de James Horner (mauvaise entité)',
    hash: '9c89644951fde9d160af38ec0f53fd9d'
  },
  {
    wikidataId: 'Q106544',
    label: 'Gérard Depardieu',
    reason: 'Photo de Claude Brasseur (mauvaise entité)',
    hash: '3217ab06dfbc9d1dfc1a363de306c5d1'
  },
  {
    wikidataId: 'Q243',
    label: 'Tour Eiffel',
    reason: 'Image bleue (test image)',
    hash: '602afe35edfc052c4c243a5268849d11'
  },
  {
    wikidataId: 'Q142',
    label: 'France',
    reason: 'Image bleue (test image)',
    hash: '6917772720858def4974f30236d629b7'
  },
  {
    wikidataId: 'Q188613',
    label: 'L\'Étranger',
    reason: 'Photo d\'Isao Takahata au lieu de la couverture',
    hash: 'bb8a71c1f6bc01090d8e6e6d8a40eb7f'
  },
  {
    wikidataId: 'Q941818',
    label: 'Rayman',
    reason: 'Image astronomique au lieu du personnage',
    hash: 'b147ac5e3557e8b68cd5e6d11ee6b659'
  },
];

async function main() {
  console.log('🧹 Nettoyage des images incorrectes\n');
  console.log('Voir: IMAGES-ISSUES-REPORT.md pour les détails\n');

  const imagesDir = path.join(__dirname, '../../public/images/collection');
  let deletedCount = 0;
  let notFoundCount = 0;
  let dbUpdatedCount = 0;

  for (const badImage of BAD_IMAGES) {
    console.log(`\n[${badImage.label}]`);
    console.log(`  Raison: ${badImage.reason}`);

    // 1. Supprimer le fichier image s'il existe
    const imagePath = path.join(imagesDir, `${badImage.hash}.jpg`);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`  ✅ Image supprimée: ${badImage.hash}.jpg`);
      deletedCount++;
    } else {
      console.log(`  ⚠️  Image non trouvée (déjà supprimée)`);
      notFoundCount++;
    }

    // 2. Réinitialiser la carte dans la DB
    try {
      // Trouver l'entité
      const entity = await prisma.entity.findUnique({
        where: { wikidataId: badImage.wikidataId },
        include: { card: true }
      });

      if (!entity) {
        console.log(`  ⚠️  Entité non trouvée dans la DB`);
        continue;
      }

      if (!entity.card) {
        console.log(`  ⚠️  Pas de carte associée`);
        continue;
      }

      // Réinitialiser la carte
      await prisma.card.update({
        where: { id: entity.card.id },
        data: {
          imageUrl: '/images/collection/placeholder.jpg',
          imageWidth: 800,
          imageHeight: 600,
          imageSourceUrl: null,
        },
      });

      console.log(`  ✅ Carte réinitialisée à placeholder`);
      dbUpdatedCount++;
    } catch (error) {
      console.error(`  ❌ Erreur DB: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Résumé:');
  console.log(`   🗑️  Images supprimées: ${deletedCount}`);
  console.log(`   ⏭️  Déjà supprimées: ${notFoundCount}`);
  console.log(`   💾 Cartes réinitialisées: ${dbUpdatedCount}`);
  console.log(`   📦 Total traité: ${BAD_IMAGES.length}`);

  console.log('\n✅ Nettoyage terminé !');
  console.log('\n📋 Prochaines étapes:');
  console.log('   1. Vérifier IMAGES-ISSUES-REPORT.md');
  console.log('   2. Corriger les URLs Wikidata manuellement');
  console.log('   3. Ou attendre l\'amélioration de la query SPARQL');
  console.log('   4. Re-lancer 06-update-card-images.ts pour ces entités');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
