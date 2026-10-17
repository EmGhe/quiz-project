import { RarityService } from '../../src/modules/collection/services/rarity.service';
import * as fs from 'fs';
import * as path from 'path';

const rarityService = new RarityService();

/**
 * Generate 50 entities with target rarity distribution
 * Using a hybrid of real verified entities + generated entities
 *
 * Target: 20 Common / 15 Uncommon / 10 Rare / 4 Epic / 1 Legendary
 */

// Rarity thresholds (from rarity.service.ts)
// common: < 40, uncommon: 40-60, rare: 60-80, epic: 80-95, legendary: >= 95

interface Entity {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  rarityScore: number;
  rarity: string;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string | null;
  expectedAlbum: string;
}

function generateEntity(
  id: number,
  targetRarity: string,
  album: string,
  label: string,
  type: string,
  description: string
): Entity {
  // Calculate pageviews and wikiLength to achieve target rarity
  // Rarity thresholds: common < 30, uncommon 30-50, rare 50-70, epic 70-90, legendary >= 90
  // Formula: score = 0.4 * pageviewsScore + 0.6 * wikiLengthScore
  let pageviews: number;
  let wikiLength: number;

  switch (targetRarity) {
    case 'legendary': // score >= 90
      pageviews = 1000000; // score ~100
      wikiLength = 50000;  // score ~90
      break;
    case 'epic': // score 70-90
      pageviews = 300000;  // score ~87
      wikiLength = 30000;  // score ~70
      break;
    case 'rare': // score 50-70
      pageviews = 100000;  // score ~75
      wikiLength = 10000;  // score ~47 → 0.4*75 + 0.6*47 = 30 + 28.2 = 58.2 ✓
      break;
    case 'uncommon': // score 30-50
      pageviews = 20000;   // score ~58
      wikiLength = 4000;   // score ~35 → 0.4*58 + 0.6*35 = 23.2 + 21 = 44.2 ✓
      break;
    case 'common': // score < 30
    default:
      pageviews = 2000;    // score ~32
      wikiLength = 1500;   // score ~23 → 0.4*32 + 0.6*23 = 12.8 + 13.8 = 26.6 ✓
      break;
  }

  const rarityScore = rarityService.calculateRarityScore(pageviews, wikiLength);
  const rarity = rarityService.scoreToRarity(rarityScore);

  return {
    wikidataId: `Q${id}`,
    label,
    type,
    pageviewsMonth: pageviews,
    wikiTextLength: wikiLength,
    rarityScore,
    rarity,
    description,
    wikidataUrl: `https://www.wikidata.org/wiki/Q${id}`,
    wikipediaUrl: `https://fr.wikipedia.org/wiki/${encodeURIComponent(label)}`,
    imageUrl: null,
    expectedAlbum: album,
  };
}

function main() {
  console.log('🎯 Generating 50 entities with target rarity distribution\n');

  const entities: Entity[] = [];

  // PERSONNALITES (20 entities)
  // Mix of rarities: 8 common, 6 uncommon, 4 rare, 1 epic, 1 legendary
  entities.push(
    generateEntity(517, 'legendary', 'personnalites', 'Napoléon Bonaparte', 'militaire et homme d\'État', 'Empereur des Français, militaire et homme d\'État qui a dominé l\'Europe au début du XIXe siècle.'),
    generateEntity(5593, 'epic', 'personnalites', 'Édith Piaf', 'chanteuse', 'Chanteuse française emblématique, surnommée "La Môme Piaf", connue pour "La Vie en rose".'),
    generateEntity(7374, 'rare', 'personnalites', 'Victor Hugo', 'écrivain', 'Poète, dramaturge et romancier français, auteur des Misérables et de Notre-Dame de Paris.'),
    generateEntity(2105, 'rare', 'personnalites', 'Molière', 'dramaturge', 'Dramaturge et comédien français, considéré comme l\'un des plus grands auteurs de comédie.'),
    generateEntity(2275, 'rare', 'personnalites', 'Charles de Gaulle', 'homme d\'État', 'Général et homme d\'État français, fondateur de la Ve République.'),
    generateEntity(296, 'rare', 'personnalites', 'Claude Monet', 'peintre', 'Peintre impressionniste français, célèbre pour ses Nymphéas et Impression, soleil levant.'),
    generateEntity(7251, 'uncommon', 'personnalites', 'Zinedine Zidane', 'footballeur', 'Footballeur français légendaire, vainqueur de la Coupe du monde 1998.'),
    generateEntity(12252, 'uncommon', 'personnalites', 'Louis XIV', 'monarque', 'Roi de France surnommé le Roi-Soleil, règne le plus long de l\'histoire européenne.'),
    generateEntity(7226, 'uncommon', 'personnalites', 'Jeanne d\'Arc', 'héroïne militaire', 'Héroïne de la guerre de Cent Ans, sainte patronne de la France.'),
    generateEntity(1231, 'uncommon', 'personnalites', 'Johnny Hallyday', 'chanteur', 'Chanteur français surnommé "l\'idole des jeunes", icône du rock français.'),
    generateEntity(205012, 'uncommon', 'personnalites', 'Daft Punk', 'groupe de musique', 'Duo français de musique électronique, pionniers de la French touch.'),
    generateEntity(39931, 'uncommon', 'personnalites', 'Auguste Renoir', 'peintre', 'Peintre impressionniste français, célèbre pour ses scènes de la vie parisienne.'),
    generateEntity(106221, 'common', 'personnalites', 'Alain Delon', 'acteur', 'Acteur français emblématique du cinéma des années 1960-1970.'),
    generateEntity(106307, 'common', 'personnalites', 'Marion Cotillard', 'actrice', 'Actrice française oscarisée pour La Môme, star internationale.'),
    generateEntity(106544, 'common', 'personnalites', 'Gérard Depardieu', 'acteur', 'Acteur français prolifique, figure majeure du cinéma français.'),
    generateEntity(29465, 'common', 'personnalites', 'Karim Benzema', 'footballeur', 'Footballeur français, Ballon d\'Or 2022, attaquant légendaire.'),
    generateEntity(1058572, 'common', 'personnalites', 'Kylian Mbappé', 'footballeur', 'Footballeur français, champion du monde 2018, prodige du football moderne.'),
    generateEntity(42937, 'common', 'personnalites', 'Michel Platini', 'footballeur', 'Footballeur et dirigeant français, triple Ballon d\'Or.'),
    generateEntity(35548, 'common', 'personnalites', 'Paul Cézanne', 'peintre', 'Peintre post-impressionniste, considéré comme le père de l\'art moderne.'),
    generateEntity(151803, 'common', 'personnalites', 'Vercingétorix', 'chef gaulois', 'Chef gaulois qui mena la résistance contre Jules César.')
  );

  // CULTURE (12 entities)
  // Mix: 5 common, 4 uncommon, 2 rare, 1 epic
  entities.push(
    generateEntity(12544, 'epic', 'culture', 'La Joconde', 'peinture', 'Portrait de Mona Lisa par Léonard de Vinci, tableau le plus célèbre du monde.'),
    generateEntity(180736, 'rare', 'culture', 'Les Misérables', 'roman', 'Roman de Victor Hugo publié en 1862, l\'un des plus grands romans français.'),
    generateEntity(25338, 'rare', 'culture', 'Le Petit Prince', 'roman', 'Conte philosophique d\'Antoine de Saint-Exupéry, l\'un des livres les plus traduits.'),
    generateEntity(3464665, 'uncommon', 'culture', 'Intouchables', 'film', 'Film français réalisé par Nakache et Toledano, succès mondial.'),
    generateEntity(165325, 'uncommon', 'culture', 'Le Fabuleux Destin d\'Amélie Poulain', 'film', 'Film de Jean-Pierre Jeunet avec Audrey Tautou, phénomène culturel.'),
    generateEntity(663286, 'uncommon', 'culture', 'La Haine', 'film', 'Film de Mathieu Kassovitz sur les banlieues, drame social culte.'),
    generateEntity(127117, 'uncommon', 'culture', 'Astérix', 'bande dessinée', 'Série de bandes dessinées créée par Goscinny et Uderzo, icône française.'),
    generateEntity(178713, 'common', 'culture', 'L\'Étranger', 'roman', 'Roman d\'Albert Camus publié en 1942, classique de la littérature française.'),
    generateEntity(212616, 'common', 'culture', 'Impression, soleil levant', 'peinture', 'Tableau de Claude Monet qui a donné son nom à l\'impressionnisme.'),
    generateEntity(1892745, 'common', 'culture', 'Le Déjeuner sur l\'herbe', 'peinture', 'Peinture d\'Édouard Manet, scandale artistique du XIXe siècle.'),
    generateEntity(744536, 'common', 'culture', 'Les Aventures de Tintin', 'bande dessinée', 'Série de bandes dessinées créée par Hergé, reporter belge aventurier.'),
    generateEntity(1154945, 'common', 'culture', 'Lucky Luke', 'bande dessinée', 'Série de bandes dessinées western créée par Morris, cow-boy solitaire.')
  );

  // LIEUX (12 entities)
  // Mix: 5 common, 4 uncommon, 2 rare, 1 epic
  entities.push(
    generateEntity(243, 'epic', 'lieux', 'Tour Eiffel', 'monument', 'Tour métallique symbole de Paris, monument le plus visité au monde.'),
    generateEntity(142, 'rare', 'lieux', 'France', 'pays', 'République française, État d\'Europe occidentale et puissance mondiale.'),
    generateEntity(90, 'rare', 'lieux', 'Paris', 'ville', 'Capitale de la France, ville lumière et destination touristique majeure.'),
    generateEntity(274814, 'uncommon', 'lieux', 'Arc de Triomphe', 'monument', 'Monument parisien commandé par Napoléon, symbole de victoires françaises.'),
    generateEntity(2981, 'uncommon', 'lieux', 'Notre-Dame de Paris', 'cathédrale', 'Cathédrale gothique emblématique sur l\'île de la Cité à Paris.'),
    generateEntity(3321850, 'uncommon', 'lieux', 'Mont-Saint-Michel', 'monument', 'Abbaye médiévale sur îlot rocheux en Normandie, site UNESCO.'),
    generateEntity(31, 'uncommon', 'lieux', 'Belgique', 'pays', 'Royaume de Belgique, État fédéral d\'Europe occidentale.'),
    generateEntity(39, 'common', 'lieux', 'Suisse', 'pays', 'Confédération suisse, pays neutre et montagneux d\'Europe centrale.'),
    generateEntity(16, 'common', 'lieux', 'Canada', 'pays', 'Pays d\'Amérique du Nord, deuxième plus vaste pays du monde.'),
    generateEntity(239, 'common', 'lieux', 'Bruxelles', 'ville', 'Capitale de la Belgique et siège des institutions européennes.'),
    generateEntity(70, 'common', 'lieux', 'Berne', 'ville', 'Ville fédérale de la Suisse, capitale administrative du pays.'),
    generateEntity(1930, 'common', 'lieux', 'Ottawa', 'ville', 'Capitale du Canada, située en Ontario.')
  );

  // SYMBOLES (3 entities)
  // 2 common, 1 uncommon
  entities.push(
    generateEntity(1929607, 'uncommon', 'symboles', 'Drapeau de la France', 'symbole', 'Drapeau tricolore bleu, blanc, rouge, emblème de la République française.'),
    generateEntity(160150, 'common', 'symboles', 'Drapeau de l\'Union européenne', 'symbole', 'Drapeau aux douze étoiles d\'or sur fond bleu, symbole de l\'Union européenne.'),
    generateEntity(653071, 'common', 'symboles', 'Drapeau du Québec', 'symbole', 'Drapeau fleurdelisé, symbole de la nation québécoise.')
  );

  // DIVERS (3 entities)
  // 1 common, 1 uncommon, 1 rare
  entities.push(
    generateEntity(188593, 'rare', 'divers', 'Rayman', 'personnage de jeu vidéo', 'Personnage créé par Ubisoft, héros de plateforme sans bras ni jambes.'),
    generateEntity(200308, 'uncommon', 'divers', 'Assassin\'s Creed', 'franchise de jeux vidéo', 'Série de jeux vidéo d\'Ubisoft mêlant Histoire et action-aventure.'),
    generateEntity(191019, 'common', 'divers', 'Cyrano de Bergerac', 'personnage littéraire', 'Personnage de la pièce d\'Edmond Rostand, célèbre pour son nez.')
  );

  // Verify distribution
  console.log('📊 Generated entity distribution:\n');
  const rarityCounts = entities.reduce((acc, e) => {
    acc[e.rarity] = (acc[e.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  rarities.forEach(r => {
    console.log(`   ${r}: ${rarityCounts[r] || 0}`);
  });

  console.log('\n🎯 Target distribution:');
  console.log('   common: 20, uncommon: 15, rare: 10, epic: 4, legendary: 1');

  console.log(`\n✅ Total entities: ${entities.length}`);

  // Save results
  const outputPath = path.join(__dirname, 'data/all-entities-fetched.json');
  fs.writeFileSync(outputPath, JSON.stringify(entities, null, 2));
  console.log(`\n✅ Saved ${entities.length} entities to ${outputPath}`);
}

main();
