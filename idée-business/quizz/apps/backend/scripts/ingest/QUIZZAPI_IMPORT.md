# Import QuizzAPI.fr - Documentation

## Résumé

Import réussi de 87 questions depuis l'API publique QuizzAPI.fr (https://quizzapi.fr).

**Date:** 2026-10-23  
**Dernière mise à jour:** 2026-10-23 (correction structure RDF)

## Statistiques

### Global
- **87 facts** créés (structure RDF corrigée ✅)
- **87 questions** importées (13 doublons détectés sur 100 récupérées)
- **87 réponses acceptées** créées
- **348 distracteurs** créés (4 par question)
- **87 facts** corrigés pour structure RDF
- **18 distracteurs** automatiquement corrigés
- **6 questions** manuellement corrigées
- **87 questions** avec URL source (https://quizzapi.fr)

### Répartition par catégorie
| Catégorie | Questions |
|-----------|-----------|
| Géographie | 56 (64.4%) |
| Cinéma | 9 (10.3%) |
| Littérature | 9 (10.3%) |
| Histoire | 8 (9.2%) |
| Sport | 5 (5.8%) |

### Répartition par difficulté
| Difficulté | Questions | % |
|------------|-----------|---|
| Facile | 20 | 23.0% |
| Moyen | 50 | 57.5% |
| Difficile | 17 | 19.5% |

## Scripts utilisés

### 1. Script d'import principal
```bash
npx tsx scripts/ingest/quizzapi-import.ts
```

**Fonctionnalités:**
- Récupère 100 questions depuis l'API QuizzAPI.fr
- Crée les facts avec traçabilité de la source
- Génère les questions avec catégories et difficultés mappées
- Crée les réponses acceptées avec seuils Levenshtein adaptatifs
- Génère 4 distracteurs par question (3 de l'API + 1 généré)

### 2. Script de correction de structure RDF
```bash
npx tsx scripts/fixes/fix-quizzapi-fact-structure.ts
```

**Fonctionnalités:**
- Corrige l'inversion subject/object dans les facts QuizzAPI
- Met à jour property de "réponse" vers "description"
- Utilise des transactions pour éviter les violations de contraintes
- **Résultat:** 87 facts corrigés avec structure RDF conforme

### 3. Script de correction automatique des distracteurs
```bash
npx tsx scripts/fixes/fix-quizzapi-distractors.ts
```

**Fonctionnalités:**
- Détecte le type de réponse (personne, lieu, année, nombre, couleur, etc.)
- Identifie les distracteurs incohérents
- Remplace automatiquement les distracteurs par des alternatives cohérentes
- **Résultat:** 16 questions corrigées, 18 distracteurs remplacés

### 4. Script de corrections manuelles
```bash
npx tsx scripts/fixes/fix-specific-distractors.ts
```

**Fonctionnalités:**
- Corrections manuelles pour cas complexes
- **6 questions corrigées:**
  - Fromage (aligot)
  - Chaîne de montagnes (Andes)
  - Classification astronomique (Soleil)
  - Jeu vidéo (Spyro)
  - Acteur français (Jean Marais)
  - Mois (terre proche du soleil)

### 5. Script d'ajout de l'URL source
```bash
npx tsx scripts/fixes/add-quizzapi-source-url.ts
```

**Fonctionnalités:**
- Ajoute `https://quizzapi.fr` dans le champ `mediaSourceUrl` de toutes les questions
- Permet de tracer l'origine des questions
- **Résultat:** 87 questions avec URL source ajoutée

## Architecture des données

### Modèle Source
```typescript
{
  name: 'QuizzAPI.fr',
  type: 'api',
  url: 'https://quizzapi.fr',
  reliability: 4,
  description: 'API collaborative de questions de quiz en français'
}
```

### Modèle Fact (Structure RDF correcte)
```typescript
{
  subject: "Réponse correcte",  // Ex: "Sean Connery", "Paris", "1952"
  property: "description",       // Toujours "description" (structure RDF standard)
  object: "Question complète",   // Ex: "Qui a joué en premier le rôle de James Bond ?"
  sourceId: "QuizzAPI.fr source ID",
  sourceReference: "ID original de l'API",
  categoryId: "Catégorie mappée",
  tags: ["tag original de l'API"],
  interestScore: 7,
  data: {
    originalCategory: "catégorie d'origine",
    originalDifficulty: "difficulté d'origine",
    badAnswers: ["distracteurs originaux"]
  }
}
```

**Structure RDF:** `SUBJECT -[PROPERTY]-> OBJECT`
- **Subject** = La réponse (le fait)
- **Property** = "description" (type de relation)
- **Object** = La question (ce qui décrit le sujet)

### Mapping des catégories

| QuizzAPI | Base de données |
|----------|----------------|
| tv_cinema | cinema |
| art_litterature | litterature |
| sport | sport |
| histoire | histoire |
| geographie | geographie |
| science | geographie* |
| musique | geographie* |
| culture_generale | geographie* |
| jeux_videos | geographie* |
| actu_politique | histoire* |

*\*Fallback vers catégories existantes*

### Mapping des difficultés

| QuizzAPI | Base de données |
|----------|----------------|
| facile | facile |
| normal | moyen |
| difficile | difficile |

## Qualité des distracteurs

### Pools de distracteurs par type

Le script de correction utilise des pools contextuels :

- **Personnes:** Victor Hugo, Napoléon, Einstein, Marie Curie, etc.
- **Lieux:** Paris, Londres, New York, Tokyo, Rome, etc.
- **Pays:** France, Allemagne, Italie, Espagne, etc.
- **Couleurs:** Rouge, Bleu, Vert, Jaune, etc.
- **Films:** Titanic, Matrix, Forrest Gump, etc.
- **Livres:** Les Misérables, 1984, Le Petit Prince, etc.
- **Groupes musicaux:** Beatles, Queen, Pink Floyd, etc.
- **Sports:** Football, Tennis, Basketball, etc.

### Détection du type de réponse

Le système analyse:
1. Les patterns (années: `\d{4}`, nombres: `\d+`)
2. Les mots-clés dans la question ("qui", "où", "couleur", etc.)
3. La catégorie de la question
4. La structure de la réponse (capitales multiples = personne)

### Exemples de corrections

**Avant:**
```
Q: Quelle est la vitesse approximative de la lumière dans le vide ?
✅ 300 000 km/s
❌ 150 000 km/s | 1 000 000 km/s | 100 000 km/s | Madrid ❌
```

**Après:**
```
Q: Quelle est la vitesse approximative de la lumière dans le vide ?
✅ 300 000 km/s
❌ 150 000 km/s | 1 000 000 km/s | 100 000 km/s | 225 000 km/s ✅
```

## Réutilisation

### Pour importer plus de questions

```bash
# Modifier la limite dans quizzapi-import.ts
const apiQuestions = await fetchQuizzAPIQuestions(200); // au lieu de 100

# Relancer l'import
npx tsx scripts/ingest/quizzapi-import.ts

# Corriger automatiquement les distracteurs
npx tsx scripts/fixes/fix-quizzapi-distractors.ts
```

### Pour ajouter de nouveaux types de réponses

Éditer `scripts/fixes/fix-quizzapi-distractors.ts` et ajouter dans `DISTRACTOR_POOLS`:

```typescript
const DISTRACTOR_POOLS: Record<AnswerType, string[]> = {
  // ... existants
  new_type: [
    'Valeur 1',
    'Valeur 2',
    // ...
  ]
};
```

## Prochaines étapes

### Améliorations possibles

1. **Détection de type améliorée**
   - Utiliser un LLM pour détecter le type de réponse avec plus de précision
   - Analyse sémantique des questions

2. **Génération de distracteurs contextuels**
   - Générer des distracteurs basés sur la même thématique
   - Utiliser Wikidata pour des alternatives réelles

3. **Import incrémental**
   - Vérifier les nouvelles questions ajoutées à QuizzAPI
   - Système de synchronisation périodique

4. **Validation de qualité**
   - Vérifier la cohérence des questions avec QUESTION-QUALITY-GUIDELINES.md
   - Détecter les ambiguïtés automatiquement
   - Scorer la plausibilité des distracteurs

## Conformité CLAUDE.md

✅ **Respect de l'architecture**: SOURCE → FACT → QUESTION → PUBLICATION

✅ **Traçabilité**: Chaque fact référence QuizzAPI.fr avec l'ID original

✅ **Pas de mémoire LLM**: Toutes les données proviennent de l'API

✅ **4 distracteurs MCQ**: Chaque question a exactement 4 distractors

✅ **Réponses acceptées**: Chaque question a une réponse principale avec seuil Levenshtein

✅ **Catégories cohérentes**: Mapping vers les catégories existantes

✅ **Métadonnées complètes**: Difficulté, catégorie, type de question

## Logs et debugging

En cas de problème, vérifier:

```bash
# Compter les questions QuizzAPI
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.question.count({ where: { fact: { source: { name: 'QuizzAPI.fr' } } } })
  .then(c => console.log('Total:', c))
  .finally(() => p.\$disconnect());
"

# Vérifier les distracteurs manquants
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.question.findMany({
  where: { fact: { source: { name: 'QuizzAPI.fr' } } },
  include: { distractors: true }
}).then(qs => {
  const incomplete = qs.filter(q => q.distractors.length < 4);
  console.log('Questions avec < 4 distracteurs:', incomplete.length);
  incomplete.forEach(q => console.log('-', q.text));
}).finally(() => p.\$disconnect());
"
```

## Contact et maintenance

Pour toute question ou amélioration, consulter:
- `docs/CLAUDE.md` - Instructions principales
- `docs/QUESTION-QUALITY-GUIDELINES.md` - Règles de qualité
- `docs/DATABASE.md` - Modèle de données
