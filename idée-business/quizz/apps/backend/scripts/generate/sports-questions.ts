import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getLevenshteinThreshold(answer: string): number {
  if (answer.length <= 5) return 1;
  if (answer.length <= 10) return 2;
  return 3;
}

async function main() {
  console.log('⚽ Generating sports questions...\n');

  const categories = {
    football: await prisma.category.findUnique({ where: { slug: 'sports-football' } }),
    tennis: await prisma.category.findUnique({ where: { slug: 'sports-tennis' } }),
    nba: await prisma.category.findUnique({ where: { slug: 'sports-nba' } }),
    rugby: await prisma.category.findUnique({ where: { slug: 'sports-rugby' } }),
    ufc: await prisma.category.findUnique({ where: { slug: 'sports-ufc' } }),
    handball: await prisma.category.findUnique({ where: { slug: 'sports-handball' } }),
    ultratrail: await prisma.category.findUnique({ where: { slug: 'sports-ultra-trail' } }),
    f1: await prisma.category.findUnique({ where: { slug: 'sports-f1' } }),
  };

  let totalQuestions = 0;
  let visualCounter = 0;

  // ===== FOOTBALL =====
  console.log('Generating Football questions...');

  // Coupe du Monde 2018
  const cdm2018 = await prisma.fact.findFirst({
    where: { subject: 'France', property: 'vainqueur Coupe du Monde', object: '2018' }
  });
  if (cdm2018 && categories.football) {
    await prisma.question.create({
      data: {
        factId: cdm2018.id,
        text: 'Quel pays a remporté la Coupe du Monde de football en Russie ?',
        difficulty: 'facile',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'France', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: 'La France', isPrimary: false, variantType: 'article', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  // Mbappé - Question descriptive
  const mbappe = await prisma.fact.findFirst({
    where: { subject: 'Kylian Mbappé', property: 'surnom' }
  });
  if (mbappe && categories.football) {
    const data = mbappe.data as any;
    await prisma.question.create({
      data: {
        factId: mbappe.id,
        text: `Quel attaquant français, champion du monde 2018 et connu pour sa vitesse exceptionnelle, est surnommé "Kyky" ?`,
        difficulty: 'moyen',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Kylian Mbappé', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Mbappé', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'Kylian Mbappe', isPrimary: false, variantType: 'sans accent', levenshteinThreshold: 2 },
            { answer: 'Mbappe', isPrimary: false, variantType: 'sans accent nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;

    // Mbappé - Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      await prisma.question.create({
        data: {
          factId: mbappe.id,
          text: `Qui est ce footballeur ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'facile',
          categoryId: categories.football.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'Kylian Mbappé', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'Mbappé', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
              { answer: 'Kylian Mbappe', isPrimary: false, variantType: 'sans accent', levenshteinThreshold: 2 },
              { answer: 'Mbappe', isPrimary: false, variantType: 'sans accent nom seul', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  // Cristiano Ronaldo - Question directe
  const cr7 = await prisma.fact.findFirst({
    where: { subject: 'Cristiano Ronaldo', property: 'surnom' }
  });
  if (cr7 && categories.football) {
    await prisma.question.create({
      data: {
        factId: cr7.id,
        text: 'Quel joueur de football est surnommé "CR7" ?',
        difficulty: 'facile',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Cristiano Ronaldo', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Ronaldo', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'Cristiano', isPrimary: false, variantType: 'prénom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  // Messi - Question visuelle + descriptive
  const messi = await prisma.fact.findFirst({
    where: { subject: 'Lionel Messi', property: 'surnom' }
  });
  if (messi && categories.football) {
    const data = messi.data as any;

    // Question descriptive
    await prisma.question.create({
      data: {
        factId: messi.id,
        text: 'Quel attaquant argentin, champion du monde 2022, est surnommé "La Pulga" (La Puce) en espagnol ?',
        difficulty: 'difficile',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Lionel Messi', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Messi', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'Lionel', isPrimary: false, variantType: 'prénom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;

    // Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      await prisma.question.create({
        data: {
          factId: messi.id,
          text: `Qui est ce footballeur ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'facile',
          categoryId: categories.football.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'Lionel Messi', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'Messi', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  // Zidane - Question visuelle
  const zidane = await prisma.fact.findFirst({
    where: { subject: 'Zinédine Zidane', property: 'surnom' }
  });
  if (zidane && categories.football) {
    const data = zidane.data as any;

    // Question directe
    await prisma.question.create({
      data: {
        factId: zidane.id,
        text: 'Quel légendaire meneur de jeu français, champion du monde 1998, est surnommé "Zizou" ?',
        difficulty: 'facile',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Zinédine Zidane', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Zidane', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'Zinedine Zidane', isPrimary: false, variantType: 'sans accent', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;

    // Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      await prisma.question.create({
        data: {
          factId: zidane.id,
          text: `Qui est ce footballeur ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'facile',
          categoryId: categories.football.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'Zinédine Zidane', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'Zidane', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
              { answer: 'Zinedine Zidane', isPrimary: false, variantType: 'sans accent', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  // Stades
  const parcDesPrinces = await prisma.fact.findFirst({
    where: { subject: 'Parc des Princes', property: 'stade de' }
  });
  if (parcDesPrinces && categories.football) {
    await prisma.question.create({
      data: {
        factId: parcDesPrinces.id,
        text: 'Quel est le nom du stade du Paris Saint-Germain ?',
        difficulty: 'moyen',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Parc des Princes', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Le Parc des Princes', isPrimary: false, variantType: 'article', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const campNou = await prisma.fact.findFirst({
    where: { subject: 'Camp Nou', property: 'stade de' }
  });
  if (campNou && categories.football) {
    await prisma.question.create({
      data: {
        factId: campNou.id,
        text: 'Quel club espagnol joue au Camp Nou ?',
        difficulty: 'moyen',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'FC Barcelone', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Barcelone', isPrimary: false, variantType: 'court', levenshteinThreshold: 2 },
            { answer: 'Barça', isPrimary: false, variantType: 'surnom', levenshteinThreshold: 1 },
            { answer: 'Barca', isPrimary: false, variantType: 'surnom sans accent', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const oldTrafford = await prisma.fact.findFirst({
    where: { subject: 'Old Trafford', property: 'stade de' }
  });
  if (oldTrafford && categories.football) {
    await prisma.question.create({
      data: {
        factId: oldTrafford.id,
        text: 'Quel club anglais joue à Old Trafford ?',
        difficulty: 'moyen',
        categoryId: categories.football.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Manchester United', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Man United', isPrimary: false, variantType: 'abrégé', levenshteinThreshold: 2 },
            { answer: 'Manchester', isPrimary: false, variantType: 'ville seule', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ Football: ${totalQuestions} questions (dont ${visualCounter} visuelles)`);

  // ===== TENNIS =====
  console.log('\nGenerating Tennis questions...');
  const tennisBefore = totalQuestions;

  const rg = await prisma.fact.findFirst({
    where: { subject: 'Roland-Garros', property: 'surface' }
  });
  if (rg && categories.tennis) {
    await prisma.question.create({
      data: {
        factId: rg.id,
        text: 'Sur quelle surface se joue le tournoi de Roland-Garros ?',
        difficulty: 'facile',
        categoryId: categories.tennis.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Terre battue', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Terre', isPrimary: false, variantType: 'court', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const wimbledon = await prisma.fact.findFirst({
    where: { subject: 'Wimbledon', property: 'surface' }
  });
  if (wimbledon && categories.tennis) {
    await prisma.question.create({
      data: {
        factId: wimbledon.id,
        text: 'Sur quelle surface se joue le tournoi de Wimbledon ?',
        difficulty: 'moyen',
        categoryId: categories.tennis.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Gazon', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: 'Herbe', isPrimary: false, variantType: 'synonyme', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const noah = await prisma.fact.findFirst({
    where: { subject: 'Yannick Noah', property: 'victoire Grand Chelem' }
  });
  if (noah && categories.tennis) {
    await prisma.question.create({
      data: {
        factId: noah.id,
        text: 'Quel joueur français est le dernier à avoir remporté Roland-Garros en simple messieurs ?',
        difficulty: 'moyen',
        categoryId: categories.tennis.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Yannick Noah', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Noah', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const federer = await prisma.fact.findFirst({
    where: { subject: 'Roger Federer', property: 'surnom' }
  });
  if (federer && categories.tennis) {
    await prisma.question.create({
      data: {
        factId: federer.id,
        text: 'Quel joueur suisse, considéré comme l\'un des plus grands tennismen de tous les temps, est connu sous les initiales "RF" ?',
        difficulty: 'facile',
        categoryId: categories.tennis.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Roger Federer', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Federer', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const nadal = await prisma.fact.findFirst({
    where: { subject: 'Rafael Nadal', property: 'surnom' }
  });
  if (nadal && categories.tennis) {
    await prisma.question.create({
      data: {
        factId: nadal.id,
        text: 'Quel joueur espagnol, surnommé le "Roi de la terre battue", est connu sous le surnom "Rafa" ?',
        difficulty: 'facile',
        categoryId: categories.tennis.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Rafael Nadal', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Nadal', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ Tennis: ${totalQuestions - tennisBefore} questions`);

  // ===== NBA =====
  console.log('\nGenerating NBA questions...');
  const nbaBefore = totalQuestions;
  let nbaVisuals = 0;

  const jordan = await prisma.fact.findFirst({
    where: { subject: 'Michael Jordan', property: 'surnom' }
  });
  if (jordan && categories.nba) {
    const data = jordan.data as any;

    // Question descriptive
    await prisma.question.create({
      data: {
        factId: jordan.id,
        text: 'Quelle légende des Chicago Bulls, considérée comme le meilleur joueur de basket de tous les temps, est surnommée "His Airness" ?',
        difficulty: 'moyen',
        categoryId: categories.nba.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Michael Jordan', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Jordan', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'MJ', isPrimary: false, variantType: 'initiales', levenshteinThreshold: 0 },
          ],
        },
      },
    });
    totalQuestions++;

    // Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      nbaVisuals++;
      await prisma.question.create({
        data: {
          factId: jordan.id,
          text: `Qui est ce basketteur ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'facile',
          categoryId: categories.nba.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'Michael Jordan', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'Jordan', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  const lebron = await prisma.fact.findFirst({
    where: { subject: 'LeBron James', property: 'surnom' }
  });
  if (lebron && categories.nba) {
    const data = lebron.data as any;

    // Question directe
    await prisma.question.create({
      data: {
        factId: lebron.id,
        text: 'Quel basketteur américain est surnommé "King James" ?',
        difficulty: 'facile',
        categoryId: categories.nba.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'LeBron James', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Lebron James', isPrimary: false, variantType: 'sans majuscule', levenshteinThreshold: 2 },
            { answer: 'LeBron', isPrimary: false, variantType: 'prénom seul', levenshteinThreshold: 2 },
            { answer: 'James', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;

    // Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      nbaVisuals++;
      await prisma.question.create({
        data: {
          factId: lebron.id,
          text: `Qui est ce basketteur ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'facile',
          categoryId: categories.nba.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'LeBron James', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'LeBron', isPrimary: false, variantType: 'prénom seul', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  const lakers = await prisma.fact.findFirst({
    where: { subject: 'Los Angeles Lakers', property: 'ville' }
  });
  if (lakers && categories.nba) {
    await prisma.question.create({
      data: {
        factId: lakers.id,
        text: 'Dans quelle ville jouent les Lakers ?',
        difficulty: 'facile',
        categoryId: categories.nba.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Los Angeles', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'LA', isPrimary: false, variantType: 'abrégé', levenshteinThreshold: 0 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const celtics = await prisma.fact.findFirst({
    where: { subject: 'Boston Celtics', property: 'ville' }
  });
  if (celtics && categories.nba) {
    await prisma.question.create({
      data: {
        factId: celtics.id,
        text: 'Dans quelle ville jouent les Celtics ?',
        difficulty: 'moyen',
        categoryId: categories.nba.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Boston', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const parker = await prisma.fact.findFirst({
    where: { subject: 'Tony Parker', property: 'nationalité' }
  });
  if (parker && categories.nba) {
    await prisma.question.create({
      data: {
        factId: parker.id,
        text: 'Quel meneur français a été champion NBA avec les San Antonio Spurs ?',
        difficulty: 'facile',
        categoryId: categories.nba.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Tony Parker', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Parker', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ NBA: ${totalQuestions - nbaBefore} questions (dont ${nbaVisuals} visuelles)`);

  // ===== RUGBY =====
  console.log('\nGenerating Rugby questions...');
  const rugbyBefore = totalQuestions;

  const sixNations = await prisma.fact.findFirst({
    where: { subject: 'Tournoi des 6 Nations', property: 'participants' }
  });
  if (sixNations && categories.rugby) {
    await prisma.question.create({
      data: {
        factId: sixNations.id,
        text: 'Combien de pays participent au Tournoi des Nations en rugby ?',
        difficulty: 'facile',
        categoryId: categories.rugby.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: '6', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 0 },
            { answer: 'Six', isPrimary: false, variantType: 'lettres', levenshteinThreshold: 0 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const xvFrance = await prisma.fact.findFirst({
    where: { subject: 'France', property: 'surnom équipe rugby' }
  });
  if (xvFrance && categories.rugby) {
    await prisma.question.create({
      data: {
        factId: xvFrance.id,
        text: 'Comment appelle-t-on l\'équipe de France de rugby à XV ?',
        difficulty: 'facile',
        categoryId: categories.rugby.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'XV de France', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: '15 de France', isPrimary: false, variantType: 'chiffres', levenshteinThreshold: 1 },
            { answer: 'Le XV de France', isPrimary: false, variantType: 'article', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const allBlacks = await prisma.fact.findFirst({
    where: { subject: 'Nouvelle-Zélande', property: 'surnom équipe rugby' }
  });
  if (allBlacks && categories.rugby) {
    await prisma.question.create({
      data: {
        factId: allBlacks.id,
        text: 'Quel est le surnom de l\'équipe de Nouvelle-Zélande de rugby, célèbre pour sa danse d\'avant-match le Haka ?',
        difficulty: 'facile',
        categoryId: categories.rugby.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'All Blacks', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: 'Les All Blacks', isPrimary: false, variantType: 'article', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const stadeFrance = await prisma.fact.findFirst({
    where: { subject: 'Stade de France', property: 'stade rugby' }
  });
  if (stadeFrance && categories.rugby) {
    await prisma.question.create({
      data: {
        factId: stadeFrance.id,
        text: 'Dans quel stade joue le XV de France ses matchs à domicile ?',
        difficulty: 'moyen',
        categoryId: categories.rugby.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Stade de France', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Le Stade de France', isPrimary: false, variantType: 'article', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const dupont = await prisma.fact.findFirst({
    where: { subject: 'Antoine Dupont', property: 'poste' }
  });
  if (dupont && categories.rugby) {
    await prisma.question.create({
      data: {
        factId: dupont.id,
        text: 'Quel capitaine du XV de France, considéré comme l\'un des meilleurs joueurs au monde, joue au poste de demi de mêlée ?',
        difficulty: 'moyen',
        categoryId: categories.rugby.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Antoine Dupont', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Dupont', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ Rugby: ${totalQuestions - rugbyBefore} questions`);

  // ===== UFC =====
  console.log('\nGenerating UFC questions...');
  const ufcBefore = totalQuestions;

  const gane = await prisma.fact.findFirst({
    where: { subject: 'Ciryl Gane', property: 'surnom' }
  });
  if (gane && categories.ufc) {
    await prisma.question.create({
      data: {
        factId: gane.id,
        text: 'Quel combattant français de MMA, ancien champion intérimaire des poids lourds UFC, est surnommé "Bon Gamin" ?',
        difficulty: 'difficile',
        categoryId: categories.ufc.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Ciryl Gane', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Gane', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const mcgregor = await prisma.fact.findFirst({
    where: { subject: 'Conor McGregor', property: 'surnom' }
  });
  if (mcgregor && categories.ufc) {
    await prisma.question.create({
      data: {
        factId: mcgregor.id,
        text: 'Quel combattant irlandais de MMA, ancien champion dans deux catégories différentes, est surnommé "The Notorious" ?',
        difficulty: 'moyen',
        categoryId: categories.ufc.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Conor McGregor', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'McGregor', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const khabib = await prisma.fact.findFirst({
    where: { subject: 'Khabib Nurmagomedov', property: 'surnom' }
  });
  if (khabib && categories.ufc) {
    await prisma.question.create({
      data: {
        factId: khabib.id,
        text: 'Quel combattant russe invaincu, ancien champion des poids légers UFC, est surnommé "The Eagle" ?',
        difficulty: 'difficile',
        categoryId: categories.ufc.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Khabib Nurmagomedov', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 3 },
            { answer: 'Khabib', isPrimary: false, variantType: 'prénom seul', levenshteinThreshold: 2 },
            { answer: 'Nurmagomedov', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 3 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ UFC: ${totalQuestions - ufcBefore} questions`);

  // ===== HANDBALL =====
  console.log('\nGenerating Handball questions...');
  const handballBefore = totalQuestions;

  const experts = await prisma.fact.findFirst({
    where: { subject: 'France', property: 'équipe handball' }
  });
  if (experts && categories.handball) {
    await prisma.question.create({
      data: {
        factId: experts.id,
        text: 'Quel est le surnom de l\'équipe de France masculine de handball, multiple championne du monde et olympique ?',
        difficulty: 'moyen',
        categoryId: categories.handball.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Les Experts', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: 'Experts', isPrimary: false, variantType: 'sans article', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const karabatic = await prisma.fact.findFirst({
    where: { subject: 'Nikola Karabatic', property: 'poste' }
  });
  if (karabatic && categories.handball) {
    await prisma.question.create({
      data: {
        factId: karabatic.id,
        text: 'Quel handballeur français, légende du handball mondial et triple champion olympique, porte le nom "Karabatic" ?',
        difficulty: 'facile',
        categoryId: categories.handball.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Nikola Karabatic', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Karabatic', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ Handball: ${totalQuestions - handballBefore} questions`);

  // ===== ULTRA TRAIL =====
  console.log('\nGenerating Ultra Trail questions...');
  const trailBefore = totalQuestions;

  const jornet = await prisma.fact.findFirst({
    where: { subject: 'Kilian Jornet', property: 'nationalité' }
  });
  if (jornet && categories.ultratrail) {
    await prisma.question.create({
      data: {
        factId: jornet.id,
        text: 'Quel coureur de trail et ski-alpinisme espagnol est considéré comme une légende vivante de l\'ultra-trail ?',
        difficulty: 'difficile',
        categoryId: categories.ultratrail.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Kilian Jornet', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Jornet', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const dhaene = await prisma.fact.findFirst({
    where: { subject: 'François d\'Haene', property: 'nationalité' }
  });
  if (dhaene && categories.ultratrail) {
    await prisma.question.create({
      data: {
        factId: dhaene.id,
        text: 'Quel coureur français est quintuple vainqueur de l\'UTMB (Ultra-Trail du Mont-Blanc) ?',
        difficulty: 'difficile',
        categoryId: categories.ultratrail.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'François d\'Haene', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'd\'Haene', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            { answer: 'François d\'haene', isPrimary: false, variantType: 'sans majuscule', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const utmb = await prisma.fact.findFirst({
    where: { subject: 'UTMB', property: 'lieu' }
  });
  if (utmb && categories.ultratrail) {
    await prisma.question.create({
      data: {
        factId: utmb.id,
        text: 'Dans quelle ville française se déroule le départ de l\'UTMB (Ultra-Trail du Mont-Blanc) ?',
        difficulty: 'moyen',
        categoryId: categories.ultratrail.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Chamonix', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ Ultra Trail: ${totalQuestions - trailBefore} questions`);

  // ===== F1 =====
  console.log('\nGenerating F1 questions...');
  const f1Before = totalQuestions;
  let f1Visuals = 0;

  const hamilton = await prisma.fact.findFirst({
    where: { subject: 'Lewis Hamilton', property: 'nationalité' }
  });
  if (hamilton && categories.f1) {
    const data = hamilton.data as any;

    // Question descriptive
    await prisma.question.create({
      data: {
        factId: hamilton.id,
        text: 'Quel pilote britannique, multiple champion du monde de Formule 1, porte le nom "Hamilton" ?',
        difficulty: 'facile',
        categoryId: categories.f1.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Lewis Hamilton', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Hamilton', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;

    // Question visuelle
    if (data.imageUrl) {
      visualCounter++;
      f1Visuals++;
      await prisma.question.create({
        data: {
          factId: hamilton.id,
          text: `Qui est ce pilote de F1 ? [${visualCounter}]`,
          questionType: 'image',
          mediaUrl: data.imageUrl,
          difficulty: 'moyen',
          categoryId: categories.f1.id,
          status: 'publie',
          enabledForDaily: true,
          enabledForMcq: true,
          acceptedAnswers: {
            create: [
              { answer: 'Lewis Hamilton', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
              { answer: 'Hamilton', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
            ],
          },
        },
      });
      totalQuestions++;
    }
  }

  const verstappen = await prisma.fact.findFirst({
    where: { subject: 'Max Verstappen', property: 'nationalité' }
  });
  if (verstappen && categories.f1) {
    await prisma.question.create({
      data: {
        factId: verstappen.id,
        text: 'Quel pilote néerlandais de Red Bull Racing est multiple champion du monde de Formule 1 ?',
        difficulty: 'facile',
        categoryId: categories.f1.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Max Verstappen', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Verstappen', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const ferrari = await prisma.fact.findFirst({
    where: { subject: 'Ferrari', property: 'pays' }
  });
  if (ferrari && categories.f1) {
    await prisma.question.create({
      data: {
        factId: ferrari.id,
        text: 'De quel pays est originaire l\'écurie Ferrari, la plus ancienne et emblématique de la Formule 1 ?',
        difficulty: 'facile',
        categoryId: categories.f1.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Italie', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
            { answer: 'L\'Italie', isPrimary: false, variantType: 'article', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const monaco = await prisma.fact.findFirst({
    where: { subject: 'Circuit de Monaco', property: 'lieu' }
  });
  if (monaco && categories.f1) {
    await prisma.question.create({
      data: {
        factId: monaco.id,
        text: 'Dans quelle principauté se trouve le circuit urbain le plus prestigieux de Formule 1 ?',
        difficulty: 'facile',
        categoryId: categories.f1.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Monaco', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 1 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  const gasly = await prisma.fact.findFirst({
    where: { subject: 'Pierre Gasly', property: 'nationalité' }
  });
  if (gasly && categories.f1) {
    await prisma.question.create({
      data: {
        factId: gasly.id,
        text: 'Quel pilote français de Formule 1 a remporté le Grand Prix d\'Italie en 2020 ?',
        difficulty: 'moyen',
        categoryId: categories.f1.id,
        status: 'publie',
        enabledForDaily: true,
        enabledForMcq: true,
        acceptedAnswers: {
          create: [
            { answer: 'Pierre Gasly', isPrimary: true, variantType: 'exacte', levenshteinThreshold: 2 },
            { answer: 'Gasly', isPrimary: false, variantType: 'nom seul', levenshteinThreshold: 2 },
          ],
        },
      },
    });
    totalQuestions++;
  }

  console.log(`✅ F1: ${totalQuestions - f1Before} questions (dont ${f1Visuals} visuelles)`);

  console.log(`\n✅ Total généré : ${totalQuestions} questions dont ${visualCounter} visuelles`);
  console.log('\n📊 Répartition :');
  console.log(`   Football : 11 questions (3 visuelles)`);
  console.log(`   Tennis : 5 questions`);
  console.log(`   NBA : 7 questions (2 visuelles)`);
  console.log(`   Rugby : 5 questions`);
  console.log(`   UFC : 3 questions`);
  console.log(`   Handball : 2 questions`);
  console.log(`   Ultra Trail : 3 questions`);
  console.log(`   F1 : 6 questions (1 visuelle)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
