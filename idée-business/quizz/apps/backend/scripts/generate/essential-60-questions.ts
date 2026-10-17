import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionData {
  text: string;
  answer: string;
  variants: string[];
  category: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  distractors: string[];
  imageUrl?: string;
  wikidataId?: string;
  wikipediaUrl?: string;
}

// ==========================================
// CINEMA (10 questions - avec images)
// ==========================================
const cinemaQuestions: QuestionData[] = [
  {
    text: "Qui est cet acteur ? [1]",
    answer: "Omar Sy",
    variants: ["Omar Sy"],
    category: "cinema",
    difficulty: "facile",
    distractors: ["Jean Dujardin", "Gad Elmaleh", "Jamel Debbouze"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Omar_Sy_Cannes_2012.jpg",
    wikidataId: "Q19560",
  },
  {
    text: "Qui est cet acteur ? [2]",
    answer: "Jean Dujardin",
    variants: ["Jean Dujardin"],
    category: "cinema",
    difficulty: "facile",
    distractors: ["Omar Sy", "Gad Elmaleh", "Guillaume Canet"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Jean_Dujardin_Cannes_2011.jpg",
    wikidataId: "Q221528",
  },
  {
    text: "Qui est ce réalisateur ? [1]",
    answer: "Luc Besson",
    variants: ["Luc Besson"],
    category: "cinema",
    difficulty: "moyen",
    distractors: ["Jean-Pierre Jeunet", "Olivier Nakache", "François Ozon"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/90/Luc_Besson_2010.jpg",
    wikidataId: "Q484779",
  },
  {
    text: "Quel film a remporté la Palme d'or à Cannes en 2019 ?",
    answer: "Parasite",
    variants: ["Parasite"],
    category: "cinema",
    difficulty: "moyen",
    distractors: ["Joker", "Once Upon a Time in Hollywood", "Les Misérables"],
  },
  {
    text: "Dans quel film Marion Cotillard incarne-t-elle Édith Piaf ?",
    answer: "La Môme",
    variants: ["La Môme", "La Vie en Rose"],
    category: "cinema",
    difficulty: "facile",
    distractors: ["Midnight in Paris", "De rouille et d'os", "Deux jours, une nuit"],
  },
  {
    text: "Quel acteur joue Driss dans Intouchables ?",
    answer: "Omar Sy",
    variants: ["Omar Sy"],
    category: "cinema",
    difficulty: "facile",
    distractors: ["Jean Dujardin", "Jamel Debbouze", "Kad Merad"],
  },
  {
    text: "Qui a réalisé Le Fabuleux Destin d'Amélie Poulain ?",
    answer: "Jean-Pierre Jeunet",
    variants: ["Jean-Pierre Jeunet"],
    category: "cinema",
    difficulty: "moyen",
    distractors: ["Luc Besson", "François Ozon", "Olivier Nakache"],
  },
  {
    text: "Quel film de science-fiction a été réalisé par Christopher Nolan en 2014 ?",
    answer: "Interstellar",
    variants: ["Interstellar"],
    category: "cinema",
    difficulty: "moyen",
    distractors: ["Inception", "Tenet", "The Prestige"],
  },
  {
    text: "Qui est cet acteur ? [3]",
    answer: "Gérard Depardieu",
    variants: ["Gérard Depardieu"],
    category: "cinema",
    difficulty: "facile",
    distractors: ["Jean Reno", "Daniel Auteuil", "Vincent Cassel"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Gerard_Depardieu_Cannes_2015.jpg",
    wikidataId: "Q106529",
  },
  {
    text: "Dans quel film Léonardo DiCaprio incarne-t-il Jordan Belfort ?",
    answer: "Le Loup de Wall Street",
    variants: ["Le Loup de Wall Street", "The Wolf of Wall Street"],
    category: "cinema",
    difficulty: "moyen",
    distractors: ["Inception", "Shutter Island", "The Revenant"],
  },
];

// ==========================================
// LITTÉRATURE (10 questions)
// ==========================================
const litteratureQuestions: QuestionData[] = [
  {
    text: "Qui a écrit Les Misérables ?",
    answer: "Victor Hugo",
    variants: ["Victor Hugo"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["Alexandre Dumas", "Émile Zola", "Gustave Flaubert"],
  },
  {
    text: "Quel écrivain français a reçu le prix Nobel de littérature en 2014 ?",
    answer: "Patrick Modiano",
    variants: ["Patrick Modiano"],
    category: "litterature",
    difficulty: "moyen",
    distractors: ["Michel Houellebecq", "Annie Ernaux", "Jean-Marie Gustave Le Clézio"],
  },
  {
    text: "Qui a écrit Le Petit Prince ?",
    answer: "Antoine de Saint-Exupéry",
    variants: ["Antoine de Saint-Exupéry", "Saint-Exupéry"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["Jules Verne", "Marcel Pagnol", "Albert Camus"],
  },
  {
    text: "Quel roman d'Albert Camus raconte l'histoire de Meursault ?",
    answer: "L'Étranger",
    variants: ["L'Étranger"],
    category: "litterature",
    difficulty: "moyen",
    distractors: ["La Peste", "La Chute", "Le Mythe de Sisyphe"],
  },
  {
    text: "Qui a écrit Le Comte de Monte-Cristo ?",
    answer: "Alexandre Dumas",
    variants: ["Alexandre Dumas"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["Victor Hugo", "Honoré de Balzac", "Stendhal"],
  },
  {
    text: "Quel auteur a créé le personnage de Sherlock Holmes ?",
    answer: "Arthur Conan Doyle",
    variants: ["Arthur Conan Doyle", "Conan Doyle"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["Agatha Christie", "Edgar Allan Poe", "Charles Dickens"],
  },
  {
    text: "Qui a écrit Madame Bovary ?",
    answer: "Gustave Flaubert",
    variants: ["Gustave Flaubert", "Flaubert"],
    category: "litterature",
    difficulty: "moyen",
    distractors: ["Émile Zola", "Guy de Maupassant", "Honoré de Balzac"],
  },
  {
    text: "Quel roman de George Orwell décrit une société totalitaire en 1984 ?",
    answer: "1984",
    variants: ["1984", "Nineteen Eighty-Four"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["La Ferme des animaux", "Brave New World", "Le Meilleur des mondes"],
  },
  {
    text: "Qui a écrit Les Trois Mousquetaires ?",
    answer: "Alexandre Dumas",
    variants: ["Alexandre Dumas"],
    category: "litterature",
    difficulty: "facile",
    distractors: ["Victor Hugo", "Jules Verne", "Honoré de Balzac"],
  },
  {
    text: "Quel écrivain a créé le personnage d'Arsène Lupin ?",
    answer: "Maurice Leblanc",
    variants: ["Maurice Leblanc"],
    category: "litterature",
    difficulty: "moyen",
    distractors: ["Gaston Leroux", "Arthur Conan Doyle", "Georges Simenon"],
  },
];

// ==========================================
// SPORT (10 questions - avec images)
// ==========================================
const sportQuestions: QuestionData[] = [
  {
    text: "Qui est ce footballeur ? [1]",
    answer: "Zinédine Zidane",
    variants: ["Zinédine Zidane", "Zidane"],
    category: "sport",
    difficulty: "facile",
    distractors: ["Thierry Henry", "Michel Platini", "Didier Deschamps"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Zidane_2010.jpg",
    wikidataId: "Q39829",
  },
  {
    text: "Qui est ce footballeur ? [2]",
    answer: "Kylian Mbappé",
    variants: ["Kylian Mbappé", "Mbappé"],
    category: "sport",
    difficulty: "facile",
    distractors: ["Antoine Griezmann", "Paul Pogba", "Karim Benzema"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Kylian_Mbappé.jpg",
    wikidataId: "Q3321062",
  },
  {
    text: "Qui est cet entraîneur de football ? [1]",
    answer: "Pep Guardiola",
    variants: ["Pep Guardiola", "Guardiola"],
    category: "sport",
    difficulty: "moyen",
    distractors: ["Jürgen Klopp", "Carlo Ancelotti", "Diego Simeone"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pep_Guardiola.jpg",
    wikidataId: "Q13133",
  },
  {
    text: "Quelle équipe de football française a remporté la Ligue des Champions en 1993 ?",
    answer: "Marseille",
    variants: ["Olympique de Marseille", "Marseille", "OM"],
    category: "sport",
    difficulty: "moyen",
    distractors: ["Paris Saint-Germain", "Lyon", "Monaco"],
  },
  {
    text: "Quel joueur de tennis français a remporté Roland-Garros en 1983 ?",
    answer: "Yannick Noah",
    variants: ["Yannick Noah", "Noah"],
    category: "sport",
    difficulty: "moyen",
    distractors: ["Henri Leconte", "Guy Forget", "Cédric Pioline"],
  },
  {
    text: "Quelle équipe de football a remporté la Coupe du Monde 2018 ?",
    answer: "France",
    variants: ["France", "La France"],
    category: "sport",
    difficulty: "facile",
    distractors: ["Croatie", "Belgique", "Angleterre"],
  },
  {
    text: "Dans quel sport Teddy Riner est-il champion olympique ?",
    answer: "Judo",
    variants: ["Judo"],
    category: "sport",
    difficulty: "facile",
    distractors: ["Lutte", "Boxe", "Karaté"],
  },
  {
    text: "Quel cycliste français a remporté le Tour de France cinq fois consécutivement de 1957 à 1961 ?",
    answer: "Jacques Anquetil",
    variants: ["Jacques Anquetil", "Anquetil"],
    category: "sport",
    difficulty: "difficile",
    distractors: ["Bernard Hinault", "Louison Bobet", "Laurent Fignon"],
  },
  {
    text: "Quelle joueuse de tennis française a remporté Roland-Garros en 2000 ?",
    answer: "Mary Pierce",
    variants: ["Mary Pierce"],
    category: "sport",
    difficulty: "moyen",
    distractors: ["Amélie Mauresmo", "Marion Bartoli", "Alizé Cornet"],
  },
  {
    text: "Dans quel sport Jean-Claude Killy est-il devenu champion olympique ?",
    answer: "Ski alpin",
    variants: ["Ski alpin", "Ski"],
    category: "sport",
    difficulty: "moyen",
    distractors: ["Ski de fond", "Biathlon", "Bobsleigh"],
  },
];

// ==========================================
// HISTOIRE (10 questions)
// ==========================================
const histoireQuestions: QuestionData[] = [
  {
    text: "En quelle année la Révolution française a-t-elle commencé ?",
    answer: "1789",
    variants: ["1789"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["1792", "1799", "1804"],
  },
  {
    text: "Quel roi de France était surnommé le Roi Soleil ?",
    answer: "Louis XIV",
    variants: ["Louis XIV", "Louis 14"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["Louis XIII", "Louis XV", "Louis XVI"],
  },
  {
    text: "En quelle année la Seconde Guerre mondiale s'est-elle terminée en Europe ?",
    answer: "1945",
    variants: ["1945"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["1944", "1946", "1943"],
  },
  {
    text: "Quel empereur français a été couronné en 1804 ?",
    answer: "Napoléon Bonaparte",
    variants: ["Napoléon Bonaparte", "Napoléon", "Bonaparte"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["Louis XVI", "Charles X", "Louis XVIII"],
  },
  {
    text: "Quelle bataille de 732 a arrêté l'expansion musulmane en Europe occidentale ?",
    answer: "Poitiers",
    variants: ["Bataille de Poitiers", "Poitiers"],
    category: "histoire",
    difficulty: "moyen",
    distractors: ["Tours", "Roncevaux", "Hastings"],
  },
  {
    text: "Qui était le président de la France pendant la Cinquième République ?",
    answer: "Charles de Gaulle",
    variants: ["Charles de Gaulle", "De Gaulle"],
    category: "histoire",
    difficulty: "moyen",
    distractors: ["François Mitterrand", "Georges Pompidou", "Valéry Giscard d'Estaing"],
  },
  {
    text: "En quelle année le Mur de Berlin est-il tombé ?",
    answer: "1989",
    variants: ["1989"],
    category: "histoire",
    difficulty: "moyen",
    distractors: ["1990", "1988", "1991"],
  },
  {
    text: "Quelle femme a été brûlée vive à Rouen en 1431 ?",
    answer: "Jeanne d'Arc",
    variants: ["Jeanne d'Arc"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["Marie-Antoinette", "Catherine de Médicis", "Anne de Bretagne"],
  },
  {
    text: "Quel traité a été signé en 1919 pour mettre fin à la Première Guerre mondiale ?",
    answer: "Traité de Versailles",
    variants: ["Traité de Versailles", "Versailles"],
    category: "histoire",
    difficulty: "moyen",
    distractors: ["Traité de Trianon", "Traité de Saint-Germain", "Traité de Sèvres"],
  },
  {
    text: "Qui a découvert l'Amérique en 1492 ?",
    answer: "Christophe Colomb",
    variants: ["Christophe Colomb", "Colomb"],
    category: "histoire",
    difficulty: "facile",
    distractors: ["Amerigo Vespucci", "Vasco de Gama", "Ferdinand Magellan"],
  },
];

// ==========================================
// CAPITALES (10 questions)
// ==========================================
const capitalesQuestions: QuestionData[] = [
  {
    text: "Quelle est la capitale de l'Italie ?",
    answer: "Rome",
    variants: ["Rome"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Milan", "Florence", "Venise"],
  },
  {
    text: "Quelle est la capitale de l'Espagne ?",
    answer: "Madrid",
    variants: ["Madrid"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Barcelone", "Séville", "Valence"],
  },
  {
    text: "Quelle est la capitale de l'Allemagne ?",
    answer: "Berlin",
    variants: ["Berlin"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Munich", "Hambourg", "Francfort"],
  },
  {
    text: "Quelle est la capitale du Portugal ?",
    answer: "Lisbonne",
    variants: ["Lisbonne"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Porto", "Faro", "Braga"],
  },
  {
    text: "Quelle est la capitale de la Norvège ?",
    answer: "Oslo",
    variants: ["Oslo"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Bergen", "Trondheim", "Stavanger"],
  },
  {
    text: "Quelle est la capitale de la Suisse ?",
    answer: "Berne",
    variants: ["Berne"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Zurich", "Genève", "Lausanne"],
  },
  {
    text: "Quelle est la capitale de l'Australie ?",
    answer: "Canberra",
    variants: ["Canberra"],
    category: "geographie",
    difficulty: "difficile",
    distractors: ["Sydney", "Melbourne", "Brisbane"],
  },
  {
    text: "Quelle est la capitale du Canada ?",
    answer: "Ottawa",
    variants: ["Ottawa"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Toronto", "Montréal", "Vancouver"],
  },
  {
    text: "Quelle est la capitale de la Turquie ?",
    answer: "Ankara",
    variants: ["Ankara"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Istanbul", "Izmir", "Antalya"],
  },
  {
    text: "Quelle est la capitale de la Pologne ?",
    answer: "Varsovie",
    variants: ["Varsovie"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Cracovie", "Gdansk", "Wrocław"],
  },
];

// ==========================================
// DRAPEAUX (10 questions - avec images SVG)
// ==========================================
const drapeauxQuestions: QuestionData[] = [
  {
    text: "Quel est ce drapeau ? [1]",
    answer: "France",
    variants: ["France"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Italie", "Pays-Bas", "Luxembourg"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
    wikidataId: "Q142",
  },
  {
    text: "Quel est ce drapeau ? [2]",
    answer: "Allemagne",
    variants: ["Allemagne"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Belgique", "Autriche", "Pays-Bas"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg",
    wikidataId: "Q183",
  },
  {
    text: "Quel est ce drapeau ? [3]",
    answer: "Italie",
    variants: ["Italie"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Irlande", "Mexique", "Hongrie"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg",
    wikidataId: "Q38",
  },
  {
    text: "Quel est ce drapeau ? [4]",
    answer: "Espagne",
    variants: ["Espagne"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Portugal", "Colombie", "Équateur"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg",
    wikidataId: "Q29",
  },
  {
    text: "Quel est ce drapeau ? [5]",
    answer: "Japon",
    variants: ["Japon"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Corée du Sud", "Chine", "Bangladesh"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg",
    wikidataId: "Q17",
  },
  {
    text: "Quel est ce drapeau ? [6]",
    answer: "Royaume-Uni",
    variants: ["Royaume-Uni", "Angleterre", "Grande-Bretagne"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["États-Unis", "Australie", "Nouvelle-Zélande"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Flag_of_the_United_Kingdom.svg",
    wikidataId: "Q145",
  },
  {
    text: "Quel est ce drapeau ? [7]",
    answer: "Canada",
    variants: ["Canada"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["États-Unis", "Mexique", "Pérou"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg",
    wikidataId: "Q16",
  },
  {
    text: "Quel est ce drapeau ? [8]",
    answer: "Brésil",
    variants: ["Brésil"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Argentine", "Uruguay", "Paraguay"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg",
    wikidataId: "Q155",
  },
  {
    text: "Quel est ce drapeau ? [9]",
    answer: "Suisse",
    variants: ["Suisse"],
    category: "geographie",
    difficulty: "facile",
    distractors: ["Autriche", "Danemark", "Norvège"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg",
    wikidataId: "Q39",
  },
  {
    text: "Quel est ce drapeau ? [10]",
    answer: "Australie",
    variants: ["Australie"],
    category: "geographie",
    difficulty: "moyen",
    distractors: ["Nouvelle-Zélande", "Royaume-Uni", "Fidji"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_Australia_%28converted%29.svg",
    wikidataId: "Q408",
  },
];

async function main() {
  console.log('🎬 Génération de 60 questions essentielles...\n');

  // Create default source
  const source = await prisma.source.upsert({
    where: { name: 'Essential Questions' },
    update: {},
    create: {
      name: 'Essential Questions',
      type: 'manuel',
      reliability: 5,
      description: 'Questions essentielles pour démarrer le quiz',
    },
  });

  // Create categories
  const categories = {
    cinema: await prisma.category.upsert({
      where: { slug: 'cinema' },
      update: {},
      create: { name: 'Cinéma', slug: 'cinema', icon: '🎬' },
    }),
    litterature: await prisma.category.upsert({
      where: { slug: 'litterature' },
      update: {},
      create: { name: 'Littérature', slug: 'litterature', icon: '📚' },
    }),
    sport: await prisma.category.upsert({
      where: { slug: 'sport' },
      update: {},
      create: { name: 'Sport', slug: 'sport', icon: '⚽' },
    }),
    histoire: await prisma.category.upsert({
      where: { slug: 'histoire' },
      update: {},
      create: { name: 'Histoire', slug: 'histoire', icon: '📜' },
    }),
    geographie: await prisma.category.upsert({
      where: { slug: 'geographie' },
      update: {},
      create: { name: 'Géographie', slug: 'geographie', icon: '🌍' },
    }),
  };

  const allQuestions = [
    ...cinemaQuestions,
    ...litteratureQuestions,
    ...sportQuestions,
    ...histoireQuestions,
    ...capitalesQuestions,
    ...drapeauxQuestions,
  ];

  let count = 0;
  for (const q of allQuestions) {
    const category = categories[q.category as keyof typeof categories];

    // Create fact
    const fact = await prisma.fact.create({
      data: {
        subject: q.answer,
        property: 'description',
        object: q.text,
        sourceId: source.id,
        categoryId: category.id,
        interestScore: 8,
      },
    });

    // Create question
    const questionType = q.imageUrl ? 'image' : 'texte';
    const question = await prisma.question.create({
      data: {
        factId: fact.id,
        text: q.text,
        questionType,
        categoryId: category.id,
        difficulty: q.difficulty,
        difficultyScore: q.difficulty === 'facile' ? 30 : q.difficulty === 'moyen' ? 50 : 70,
        mediaUrl: q.imageUrl,
        mediaSourceUrl: q.wikidataId ? `https://www.wikidata.org/wiki/${q.wikidataId}` : undefined,
        status: 'publie',
        qualityScore: 95,
        enabledForDaily: true,
        enabledForMcq: true,
      },
    });

    // Create primary answer
    await prisma.acceptedAnswer.create({
      data: {
        questionId: question.id,
        answer: q.answer,
        isPrimary: true,
        variantType: 'exacte',
      },
    });

    // Create variant answers
    for (const variant of q.variants) {
      if (variant !== q.answer) {
        await prisma.acceptedAnswer.create({
          data: {
            questionId: question.id,
            answer: variant,
            isPrimary: false,
            variantType: 'abreviation',
          },
        });
      }
    }

    // Create distractors
    for (let i = 0; i < q.distractors.length; i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: q.distractors[i],
          order: i + 1,
          plausibilityScore: 80,
        },
      });
    }

    count++;
    console.log(`✅ ${count}/60 - ${q.category}: ${q.text}`);
  }

  console.log(`\n✅ ${count} questions créées avec succès !`);
  console.log('\n📊 Répartition par thématique :');
  console.log(`  🎬 Cinéma: ${cinemaQuestions.length}`);
  console.log(`  📚 Littérature: ${litteratureQuestions.length}`);
  console.log(`  ⚽ Sport: ${sportQuestions.length}`);
  console.log(`  📜 Histoire: ${histoireQuestions.length}`);
  console.log(`  🌍 Capitales: ${capitalesQuestions.length}`);
  console.log(`  🚩 Drapeaux: ${drapeauxQuestions.length}`);

  console.log('\n📸 Images à télécharger :');
  const withImages = allQuestions.filter((q) => q.imageUrl);
  console.log(`  ${withImages.length} questions avec images`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
