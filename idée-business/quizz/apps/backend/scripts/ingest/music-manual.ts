import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données musique - Phase 7 (~60 questions)
const MUSIC_DATA = {
  artistesFrancais: [
    // Variété française classique
    { subject: 'Charles Aznavour', property: 'chanson célèbre', object: 'La Bohème', data: { description: 'Chanteur français d\'origine arménienne, l\'un des plus grands de la chanson française' } },
    { subject: 'Édith Piaf', property: 'chanson célèbre', object: 'La Vie en rose', data: { description: 'Icône de la chanson française, surnommée "La Môme Piaf"' } },
    { subject: 'Jacques Brel', property: 'chanson célèbre', object: 'Ne me quitte pas', data: { description: 'Auteur-compositeur-interprète belge francophone, figure majeure de la chanson française' } },
    { subject: 'Claude François', property: 'surnom', object: 'Cloclo', data: { description: 'Chanteur et danseur français, auteur de "Comme d\'habitude" adapté en "My Way"' } },
    { subject: 'Georges Brassens', property: 'chanson célèbre', object: 'Les Copains d\'abord', data: { description: 'Poète et auteur-compositeur-interprète français' } },
    { subject: 'Serge Gainsbourg', property: 'chanson célèbre', object: 'Je t\'aime... moi non plus', data: { description: 'Auteur-compositeur-interprète, réalisateur et acteur français, figure provocatrice' } },

    // Variété contemporaine
    { subject: 'Jean-Jacques Goldman', property: 'chanson célèbre', object: 'Envole-moi', data: { description: 'Auteur-compositeur-interprète français, l\'un des artistes les plus populaires' } },
    { subject: 'Francis Cabrel', property: 'chanson célèbre', object: 'Je l\'aime à mourir', data: { description: 'Auteur-compositeur-interprète français' } },
    { subject: 'Alain Souchon', property: 'chanson célèbre', object: 'Foule sentimentale', data: { description: 'Auteur-compositeur-interprète et acteur français' } },
    { subject: 'Renaud', property: 'surnom', object: 'Renaud', data: { description: 'Chanteur français engagé, figure de la chanson réaliste et contestataire' } },

    // Rap français
    { subject: 'IAM', property: 'chanson célèbre', object: 'Je danse le Mia', data: { description: 'Groupe de rap français originaire de Marseille, pionnier du rap français' } },
    { subject: 'NTM', property: 'signification', object: 'Suprême NTM', data: { description: 'Duo de rap français légendaire, pionnier du mouvement hip-hop français' } },
    { subject: 'Booba', property: 'surnom', object: 'Le Duc de Boulogne', data: { description: 'Rappeur français, l\'une des figures majeures du rap français' } },
    { subject: 'Orelsan', property: 'album', object: 'Civilisation', data: { description: 'Rappeur et réalisateur français originaire de Caen' } },
    { subject: 'Stromae', property: 'chanson célèbre', object: 'Formidable', data: { description: 'Auteur-compositeur-interprète belge, phénomène de la pop francophone moderne' } },
    { subject: 'PNL', property: 'membres', object: 'Ademo et N.O.S', data: { description: 'Duo de rappeurs français mystérieux, frères originaires de Paris' } },

    // Pop/Électro française
    { subject: 'Daft Punk', property: 'chanson célèbre', object: 'Get Lucky', data: { description: 'Duo français de musique électronique aux casques iconiques' } },
    { subject: 'David Guetta', property: 'genre', object: 'DJ et producteur', data: { description: 'DJ et producteur français de musique électronique, succès mondial' } },
    { subject: 'Justice', property: 'genre', object: 'Musique électronique', data: { description: 'Duo français d\'electro house' } },
    { subject: 'Christine and the Queens', property: 'vrai nom', object: 'Héloïse Létissier', data: { description: 'Auteure-compositrice-interprète française de pop expérimentale' } },
    { subject: 'Indila', property: 'chanson célèbre', object: 'Dernière Danse', data: { description: 'Chanteuse française de R&B et soul' } },

    // Rock français
    { subject: 'Téléphone', property: 'chanson célèbre', object: 'Un autre monde', data: { description: 'Groupe de rock français mythique des années 70-80' } },
    { subject: 'Noir Désir', property: 'chanson célèbre', object: 'Le Vent nous portera', data: { description: 'Groupe de rock français alternatif' } },
    { subject: 'Louise Attaque', property: 'chanson célèbre', object: 'J\'t\'emmène au vent', data: { description: 'Groupe de rock alternatif français' } },

    // Artistes récents
    { subject: 'Angèle', property: 'chanson célèbre', object: 'Balance ton quoi', data: { description: 'Auteure-compositrice-interprète belge francophone' } },
    { subject: 'Ninho', property: 'album', object: 'Destin', data: { description: 'Rappeur français d\'origine congolaise' } },
    { subject: 'Aya Nakamura', property: 'chanson célèbre', object: 'Djadja', data: { description: 'Chanteuse française d\'origine malienne, phénomène de la pop urbaine' } },
    { subject: 'Jul', property: 'origine', object: 'Marseille', data: { description: 'Rappeur français prolifique originaire de Marseille' } },
    { subject: 'Soprano', property: 'chanson célèbre', object: 'Le Coach', data: { description: 'Rappeur français originaire de Marseille, membre de Psy 4 de la Rime' } },
  ],

  artistesInternationaux: [
    // Légendes
    { subject: 'The Beatles', property: 'album célèbre', object: 'Abbey Road', data: { description: 'Groupe britannique légendaire, les plus grands vendeurs de disques de l\'histoire' } },
    { subject: 'Michael Jackson', property: 'surnom', object: 'King of Pop', data: { description: 'Chanteur américain, icône mondiale de la pop' } },
    { subject: 'Queen', property: 'chanson célèbre', object: 'Bohemian Rhapsody', data: { description: 'Groupe de rock britannique légendaire mené par Freddie Mercury' } },
    { subject: 'Elvis Presley', property: 'surnom', object: 'The King', data: { description: 'Chanteur américain, icône du rock \'n\' roll' } },
    { subject: 'Bob Marley', property: 'genre', object: 'Reggae', data: { description: 'Chanteur jamaïcain, légende du reggae et symbole de paix' } },

    // Pop internationale moderne
    { subject: 'Beyoncé', property: 'surnom', object: 'Queen Bey', data: { description: 'Chanteuse américaine, icône de la pop et du R&B' } },
    { subject: 'Madonna', property: 'surnom', object: 'Queen of Pop', data: { description: 'Chanteuse américaine, icône de la pop depuis les années 80' } },
    { subject: 'Lady Gaga', property: 'chanson célèbre', object: 'Bad Romance', data: { description: 'Chanteuse américaine connue pour ses tenues extravagantes' } },
    { subject: 'Rihanna', property: 'origine', object: 'Barbade', data: { description: 'Chanteuse et femme d\'affaires originaire de la Barbade' } },
    { subject: 'Ed Sheeran', property: 'chanson célèbre', object: 'Shape of You', data: { description: 'Auteur-compositeur-interprète britannique de pop' } },

    // Hip-hop/Rap international
    { subject: 'Eminem', property: 'surnom', object: 'Slim Shady', data: { description: 'Rappeur américain, l\'un des artistes les plus vendus de tous les temps' } },
    { subject: 'Dr. Dre', property: 'rôle', object: 'Producteur et rappeur', data: { description: 'Producteur et rappeur américain, co-fondateur de Death Row Records' } },
    { subject: 'Kanye West', property: 'album', object: 'The College Dropout', data: { description: 'Rappeur et producteur américain controversé' } },

    // Rock/Alternatif
    { subject: 'Nirvana', property: 'leader', object: 'Kurt Cobain', data: { description: 'Groupe de rock alternatif américain, symbole du grunge' } },
    { subject: 'Coldplay', property: 'chanson célèbre', object: 'Viva la Vida', data: { description: 'Groupe de rock alternatif britannique' } },
  ],

  albums: [
    { subject: 'Thriller', property: 'artiste', object: 'Michael Jackson', data: { description: 'Album le plus vendu de tous les temps' } },
    { subject: 'Abbey Road', property: 'artiste', object: 'The Beatles', data: { description: 'Album emblématique avec la pochette du passage piéton' } },
    { subject: 'The Dark Side of the Moon', property: 'artiste', object: 'Pink Floyd', data: { description: 'Album concept de rock progressif britannique' } },
    { subject: '21', property: 'artiste', object: 'Adele', data: { description: 'Album à succès de la chanteuse britannique' } },
    { subject: 'Random Access Memories', property: 'artiste', object: 'Daft Punk', data: { description: 'Album français primé aux Grammy Awards' } },
    { subject: 'Back to Black', property: 'artiste', object: 'Amy Winehouse', data: { description: 'Album emblématique de la chanteuse britannique' } },
    { subject: 'OK Computer', property: 'artiste', object: 'Radiohead', data: { description: 'Album de rock alternatif britannique acclamé' } },
    { subject: 'Nevermind', property: 'artiste', object: 'Nirvana', data: { description: 'Album grunge américain emblématique avec "Smells Like Teen Spirit"' } },
  ],
};

async function main() {
  console.log('🎵 Ingesting music data...\n');

  // Create or find source
  const source = await prisma.source.upsert({
    where: { name: 'Manuel - Musique' },
    update: {},
    create: {
      name: 'Manuel - Musique',
      type: 'manuel',
      reliability: 5,
      description: 'Données musicales vérifiées manuellement (artistes, groupes, chansons, albums)',
    },
  });

  // Get categories
  const categories = {
    artistesFrancais: await prisma.category.findUnique({ where: { slug: 'musique-artistes-francais' } }),
    artistesInternationaux: await prisma.category.findUnique({ where: { slug: 'musique-artistes-internationaux' } }),
    albums: await prisma.category.findUnique({ where: { slug: 'musique-albums' } }),
  };

  if (Object.values(categories).some(c => !c)) {
    throw new Error('Some music categories not found. Run create-music-categories.ts first.');
  }

  let totalFacts = 0;

  // Process each music type
  for (const [type, facts] of Object.entries(MUSIC_DATA)) {
    console.log(`\nProcessing ${type}...`);
    const category = categories[type as keyof typeof categories];

    if (!category) {
      console.log(`❌ Category not found for ${type}`);
      continue;
    }

    for (const factData of facts) {
      await prisma.fact.upsert({
        where: {
          subject_property_object: {
            subject: factData.subject,
            property: factData.property,
            object: factData.object,
          },
        },
        update: {},
        create: {
          subject: factData.subject,
          property: factData.property,
          object: factData.object,
          sourceId: source.id,
          categoryId: category.id,
          tags: ['musique', type],
          data: factData.data || {},
        },
      });
      totalFacts++;
    }

    console.log(`  ✅ ${facts.length} facts`);
  }

  console.log(`\n✅ Total: ${totalFacts} music facts created`);
  console.log('\nBreakdown:');
  Object.entries(MUSIC_DATA).forEach(([type, facts]) => {
    console.log(`   ${type}: ${facts.length} facts`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
