import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 16 - Films/Livres résumés (20 questions)
const SUMMARIES = [
  {
    title: 'Harry Potter à l\'école des sorciers',
    type: 'film',
    summary: 'Un jeune garçon découvre le jour de ses 11 ans qu\'il possède des pouvoirs magiques et qu\'il est attendu dans une école de sorcellerie. Il y noue des amitiés et découvre peu à peu les circonstances mystérieuses liées à la mort de ses parents',
  },
  {
    title: 'Le Seigneur des Anneaux',
    type: 'film',
    summary: 'Un petit hobbit hérite d\'un anneau magique aux pouvoirs redoutables et doit entreprendre un périlleux voyage pour le détruire dans les flammes de la montagne où il a été forgé, accompagné d\'une communauté de héros',
  },
  {
    title: 'Star Wars',
    type: 'film',
    summary: 'Dans une galaxie lointaine, un jeune fermier découvre qu\'il est destiné à devenir un chevalier Jedi et rejoint une rébellion contre un empire galactique tyrannique dirigé par un seigneur masqué',
  },
  {
    title: 'Titanic',
    type: 'film',
    summary: 'À bord du célèbre paquebot lors de son voyage inaugural en 1912, une jeune aristocrate tombe amoureuse d\'un artiste pauvre, mais leur histoire est tragiquement interrompue par le naufrage du navire',
  },
  {
    title: 'Intouchables',
    type: 'film',
    summary: 'Un aristocrate tétraplégique embauche comme aide à domicile un jeune homme de banlieue tout juste sorti de prison. Une amitié improbable naît entre ces deux personnes que tout oppose',
  },
  {
    title: 'Forrest Gump',
    type: 'film',
    summary: 'Un homme au QI limité mais au grand cœur traverse plusieurs décennies de l\'histoire américaine, influençant sans le savoir de nombreux événements historiques tout en poursuivant son amour d\'enfance',
  },
  {
    title: 'Matrix',
    type: 'film',
    summary: 'Un programmeur informatique découvre que la réalité dans laquelle il vit n\'est qu\'une simulation créée par des machines intelligentes, et qu\'il pourrait être l\'élu destiné à libérer l\'humanité',
  },
  {
    title: 'Le Parrain',
    type: 'film',
    summary: 'Le chef d\'une puissante famille mafieuse new-yorkaise vieillit et doit transmettre son empire criminel à son fils réticent, qui finira par accepter de perpétuer la tradition familiale',
  },
  {
    title: 'Inception',
    type: 'film',
    summary: 'Un voleur spécialisé dans l\'extraction de secrets enfouis dans le subconscient pendant le sommeil se voit confier la mission inverse : implanter une idée dans l\'esprit d\'un homme d\'affaires',
  },
  {
    title: 'Avatar',
    type: 'film',
    summary: 'Sur une lune extraterrestre, un marine paraplégique habite un corps alien pour infiltrer un peuple indigène, mais il tombe amoureux de leur culture et prend leur défense contre les colonisateurs',
  },
  {
    title: '1984',
    type: 'livre',
    summary: 'Dans une société totalitaire où Big Brother surveille chaque citoyen, un homme travaillant au ministère de la Vérité commence à remettre en question le régime et tombe amoureux, ce qui est interdit',
  },
  {
    title: 'Le Petit Prince',
    type: 'livre',
    summary: 'Un aviateur en panne dans le désert rencontre un jeune prince venu d\'une autre planète qui lui raconte ses voyages et ses rencontres, délivrant des leçons sur l\'amour, l\'amitié et le sens de la vie',
  },
  {
    title: 'L\'Étranger',
    type: 'livre',
    summary: 'Un homme indifférent et détaché assiste aux funérailles de sa mère sans pleurer, puis commet un meurtre absurde sur une plage et se retrouve jugé autant pour son attitude que pour son crime',
  },
  {
    title: 'Les Misérables',
    type: 'livre',
    summary: 'Un ancien bagnard condamné pour le vol d\'un pain tente de se racheter et de mener une vie honnête, tout en étant traqué par un inspecteur obstiné, dans la France du XIXe siècle',
  },
  {
    title: 'Roméo et Juliette',
    type: 'livre',
    summary: 'Deux jeunes gens de familles ennemies tombent éperdument amoureux et décident de s\'unir en secret, mais leur histoire se termine tragiquement à cause de la haine qui oppose leurs clans',
  },
  {
    title: 'Crime et Châtiment',
    type: 'livre',
    summary: 'Un étudiant désargenté commet un meurtre qu\'il croit justifié par la philosophie, mais il est ensuite rongé par la culpabilité et tourmenté psychologiquement jusqu\'à finalement confesser son crime',
  },
  {
    title: 'Le Comte de Monte-Cristo',
    type: 'livre',
    summary: 'Un marin innocent est emprisonné suite à une trahison, s\'évade après 14 ans, découvre un trésor et revient sous une nouvelle identité pour se venger méthodiquement de ceux qui l\'ont trahi',
  },
  {
    title: 'L\'Alchimiste',
    type: 'livre',
    summary: 'Un jeune berger andalou part en quête d\'un trésor en Égypte après avoir fait un rêve récurrent, et son voyage devient une quête spirituelle qui lui enseigne à suivre sa légende personnelle',
  },
  {
    title: 'Orgueil et Préjugés',
    type: 'livre',
    summary: 'Une jeune femme d\'une famille modeste développe une relation complexe avec un aristocrate riche et distant, et tous deux doivent surmonter leurs préjugés pour reconnaître leurs sentiments mutuels',
  },
  {
    title: 'Le Hobbit',
    type: 'livre',
    summary: 'Un paisible habitant d\'un trou confortable est entraîné malgré lui dans une aventure avec un groupe de nains qui cherchent à reprendre leur royaume et leur trésor à un dragon redoutable',
  },
];

async function main() {
  console.log('📖 Ingesting summaries facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Summaries' },
    update: {},
    create: { name: 'Manual - Summaries', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'cinema-films' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of SUMMARIES) {
    const existing = await prisma.fact.findFirst({
      where: { subject: item.title, property: 'summary' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.title,
        property: 'summary',
        object: item.title,
        data: { title: item.title, summary: item.summary, type: item.type },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.title} (${item.type})`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
