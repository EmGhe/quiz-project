# Guidelines de Qualité des Questions

**⚠️ LIRE AVANT chaque génération de questions**

---

## 📋 Règles Fondamentales

### ✅ Une bonne question doit être :

1. **Objective** : Une seule réponse possible
2. **Claire** : Français naturel, pas d'ambiguïté
3. **Vérifiable** : Basée sur un fait sourcé
4. **Intéressante** : Suffisamment stimulante
5. **Unique** : Aucun doublon

---

## ❌ À Éviter Absolument

### 1. Questions vagues

**Interdit :**
```
❌ "Quel acteur joue dans Intouchables ?"
   → Plusieurs acteurs, réponse ambiguë

❌ "YouTubeur français humoristique, pionnier de YouTube"
   → S'applique à Cyprien, Norman, Squeezie...
```

**Correct :**
```
✅ "Quel acteur joue Driss dans Intouchables ?"
   → Rôle spécifique = réponse unique

✅ "Créateur du GP Explorer. Quel est ce YouTubeur ?"
   → Élément distinctif unique
```

**Règle :** Les descriptions doivent contenir **au moins UN élément UNIQUE** (rôle, projet, accomplissement).

---

### 2. Questions subjectives

**Interdit :**
```
❌ "Pourquoi..."
❌ "Comment..."
❌ "Expliquez..."
❌ "Quel est le meilleur..."
```

---

### 3. Précisions numériques

**Interdit :**
- Population exacte
- Altitude précise
- Distance/Surface exacte
- Poids/Taille précis
- Température/Vitesse exacte

**Exception :** Dates d'événements historiques majeurs (1789, 1945, etc.)

---

### 4. Réponse révélée dans la question

**Interdit :**
```
❌ "Qui est ce réalisateur ? (Olivier Nakache et Éric Toledano)"
```

**Correct :**
```
✅ "Qui est ce réalisateur ? [1]"
```

---

## 🖼️ Questions Visuelles (Images)

### Format des questions

Utiliser `[N]` pour distinguer les questions similaires :
```
Qui est cet acteur ? [1]
Qui est cet acteur ? [2]
...
```

**Ne JAMAIS révéler la réponse dans le texte.**

---

### Sources d'images recommandées

**✅ Fonctionnent bien (faible taux d'échec) :**
- Drapeaux de pays (SVG Wikimedia Commons)
- Animaux (photos naturelles)
- Plantes et fleurs
- Monuments et lieux géographiques
- Tableaux de peinture (< 5 MB)

**⚠️ Problématiques (taux d'échec élevé) :**
- Personnages d'anime/manga (copyright)
- Personnages de jeux vidéo (copyright)
- Photos récentes de célébrités (souvent supprimées)
- Tableaux haute résolution (> 10 MB)

**❌ À éviter complètement :**
- URLs `wikipedia.org/en/` (non supportées)
- Images copyrightées sans licence libre
- Screenshots de films/séries

---

### Specs techniques des images

**URLs acceptées :**
```
✅ https://upload.wikimedia.org/wikipedia/commons/a/b/File.jpg
✅ https://upload.wikimedia.org/wikipedia/commons/a/b/File.svg
```

**URLs refusées :**
```
❌ https://upload.wikimedia.org/wikipedia/commons/thumb/...
❌ https://upload.wikimedia.org/wikipedia/en/...
❌ http://localhost:3000/api/proxy/...
```

**Formats supportés :**
- **SVG** : Pas d'optimisation (gardé tel quel)
- **JPG** : Resize 800px max + quality 85%
- **PNG** : Resize 800px max + compression level 8

**Taille maximale :** 5 MB (les images > 10 MB seront rejetées)

---

## 📊 Pipeline d'Images (Automatique)

Le script `download-and-store-all-images.ts` gère automatiquement :

### Phase 1 : Téléchargements normaux
1. Skip les images déjà locales
2. Télécharge les images disponibles
3. Si 404 → Recherche automatique de remplacement via API
4. Si pas trouvé → Désactive la question

### Phase 2 : Téléchargement remplacements
1. Batch pre-fetch métadonnées (50 par lot)
2. Télécharge séquentiellement (délai 30s)
3. Optimise avec Sharp
4. Met à jour DB avec métadonnées de licence

### Rapport automatique

Fichier : `scripts/images/failed-images-report.json`

Contient :
- Questions désactivées
- URLs originales
- Raisons d'échec
- Tentatives de remplacement

---

## 🔧 Maintenance des Images

### Problèmes fréquents et solutions

#### 1. SVG corrompus (données binaires)

**Symptôme** : Image ne s'affiche pas, fichier contient du binaire au lieu de XML

**Solution automatique** :
```bash
npx ts-node scripts/images/fix-corrupted-images.ts
```

**Ce qui est fait** :
- Détecte SVG sans balise `<svg>`
- Re-télécharge depuis `fact.data.flagUrl`
- Sauvegarde proprement en UTF-8

**Résultat** : 27 drapeaux réparés (2026-10-15)

---

#### 2. Photos de personnes mal cadrées

**Symptôme** : Visage trop petit, difficile à identifier (entraîneurs, acteurs, réalisateurs)

**Solution automatique** :
```bash
npx ts-node scripts/images/smart-crop-portraits.ts
```

**Ce qui est fait** :
- Détecte questions avec "entraîneur", "acteur", "réalisateur", etc.
- Crop intelligent 500×500 centré sur visage (Sharp "attention" strategy)
- JPEG qualité 90 pour portraits
- Backup automatique (`.backup`)

**Résultat** :
- 64 portraits optimisés (2026-10-15)
- Réduction taille ~40-50%
- Visages bien visibles et centrés

**Restaurer originaux** :
```bash
cd apps/frontend/public/images/quiz
for f in *.backup; do mv "$f" "${f%.backup}"; done
```

---

#### 3. Images trop volumineuses

**Symptôme** : Fichiers > 150 KB

**Solution** :
```bash
npx ts-node scripts/images/fix-large-images.ts
```

---

#### 4. URLs obsolètes ou proxy

**Symptôme** : URLs `localhost:3000/api/proxy` ou liens cassés

**Solution** :
```bash
npx ts-node scripts/images/fix-proxy-urls.ts
npx ts-node scripts/images/refresh-wikimedia-urls.ts
```

---

### Workflow de maintenance recommandé

**Après génération de nouvelles questions** :
1. `download-and-store-all-images.ts` → télécharge nouvelles images
2. `fix-corrupted-images.ts` → répare corruptions
3. `smart-crop-portraits.ts` → optimise portraits
4. `fix-large-images.ts` → réduit tailles excessives

**Inspection manuelle** : Tester aléatoirement 10-20 questions visuelles dans l'interface.

---

### Bonnes pratiques pour portraits

**✅ Faire** :
- Utiliser photos avec visage visible et centré
- Préférer portraits officiels ou photos promotionnelles
- Vérifier que le nom de la personne est dans l'URL Wikimedia (validation automatique)

**❌ Éviter** :
- Photos de groupe (ambiguïté)
- Photos de dos ou de profil
- Photos anciennes basse résolution
- Photos recadrées par Wikimedia (préférer originales)

**Script de crop** : Transforme automatiquement les photos problématiques en 500×500 centrées sur le visage.

---

## 📝 Catégories et Réponses

### Daily (Texte)

**Normalisation requise :**
- Casse
- Espaces
- Ponctuation
- Accents (si pertinent)

**Distance Levenshtein :**
- ≤ 4 caractères → distance 1
- 5-8 caractères → distance 2
- ≥ 9 caractères → distance 3

**N'accepter que les variantes légitimes.**

---

### MCQ (Multiple Choice)

**Structure :**
- 1 bonne réponse
- 4 distracteurs plausibles

**Règles distracteurs :**
- ✅ Même type/catégorie que la bonne réponse
- ✅ Plausibles mais incorrects
- ❌ Jamais une variante de la bonne réponse
- ❌ Jamais évidemment absurdes
- ❌ Jamais de doublons

**Exemples :**
```
Question : Capitale de la France ?
✅ Bonne : Paris
✅ Distracteurs : Londres, Berlin, Rome, Madrid (capitales européennes)
❌ Mauvais : New York, Tokyo (pas européennes)
❌ Mauvais : Tour Eiffel (pas une ville)
```

---

## 🎯 Catégories : Type de Réponse

**La catégorie = TYPE de réponse attendu**, pas le sujet de la question.

**Exemples :**
```
"Quelle est la capitale de l'Italie ?"
→ Catégorie : VILLE (pas "Géographie")

"En quelle année a eu lieu la Révolution française ?"
→ Catégorie : DATE (pas "Histoire")

"Qui a peint La Joconde ?"
→ Catégorie : PERSONNE/PEINTRE (pas "Art")
```

---

## ✅ Checklist Avant Publication

- [ ] Source/fait vérifiable
- [ ] Réponse unique et objective
- [ ] Question non vague (élément distinctif unique)
- [ ] Réponse non révélée dans la question
- [ ] Français naturel et clair
- [ ] Pas de précision numérique interdite
- [ ] Pas de date inutilement précise
- [ ] Bonne catégorie (type de réponse)
- [ ] Réponses acceptées légitimes (Daily)
- [ ] 4 distracteurs plausibles (MCQ)
- [ ] Aucun doublon
- [ ] Difficulté appropriée
- [ ] Image vérifiée (questions visuelles)
- [ ] URL Wikimedia Commons directe (pas de thumb)

---

## 🎮 Mode PVP : Exactement 4 Distractors Requis (Session 2026-10-17)

### Règle critique

**Le mode PVP (Player vs Player) nécessite EXACTEMENT 4 distractors par question.**

```
Question MCQ PVP = 1 bonne réponse + 4 distractors = 5 choix affichés
```

### Validation backend

Le serveur vérifie au démarrage de chaque match :

```typescript
// match.service.ts - startMatch()
const invalidQuestions = questions.filter((q) => q.distractors.length < 4);

if (invalidQuestions.length > 0) {
  console.error(
    `[Match] Invalid questions without enough distractors: ${invalidQuestions.map((q) => q.id).join(', ')}`
  );
  await this.cancelMatch(matchId, 'Invalid questions');
  return;
}
```

**Si une question a moins de 4 distractors, le match est annulé avec l'erreur :**
```
Match annulé: Invalid questions
```

### Pourquoi exactement 4 ?

1. **UX cohérente** : Toutes les questions MCQ ont le même nombre de choix (5)
2. **Équité** : Difficulté comparable entre toutes les questions
3. **Design UI** : Interface optimisée pour 5 choix
4. **Simplicité** : Pas de logique conditionnelle (3, 4 ou 5 choix)

### Structure en base de données

```prisma
model Question {
  id          String   @id @default(uuid())
  text        String   @unique
  
  // Relations
  acceptedAnswers  AcceptedAnswer[]  // >= 1 (bonne réponse)
  distractors      Distractor[]      // EXACTEMENT 4 pour PVP
  
  // Flags
  enabledForMcq    Boolean @default(false)  // ✅ Require 4 distractors
  enabledForDaily  Boolean @default(false)  // ⚠️ Flexible (peut avoir 3)
}

model Distractor {
  id              String  @id @default(uuid())
  questionId      String
  distractorText  String
  order           Int     // 1, 2, 3, 4
  plausibilityScore Int   // 0-100
}
```

### Script de vérification

**Identifier les questions avec moins de 4 distractors :**
```typescript
// scripts/fixes/check-mcq-distractors.ts
const questionsNeedingDistractor = await prisma.question.findMany({
  where: {
    enabledForMcq: true,
  },
  include: {
    distractors: true,
  },
});

const invalid = questionsNeedingDistractor.filter(q => q.distractors.length < 4);

console.log(`❌ ${invalid.length} questions MCQ avec < 4 distractors`);
invalid.forEach(q => {
  console.log(`  - "${q.text}" → ${q.distractors.length} distractors`);
});
```

### Script de correction

**Ajouter automatiquement le 4ème distractor :**
```typescript
// scripts/fixes/add-missing-4th-distractor.ts

// Pools de distractors par catégorie
const extraDistractors: Record<string, string[]> = {
  cinema: ['Karin Viard', 'Juliette Binoche', 'Audrey Tautou', ...],
  litterature: ['Jean-Paul Sartre', 'Simone de Beauvoir', ...],
  sport: ['Platini', 'Cantona', 'Ribéry', 'Benzema', ...],
  histoire: ['1815', '1848', 'Louis XV', 'Henri IV', ...],
  geographie: ['Oslo', 'Helsinki', 'Stockholm', ...],
};

for (const question of questionsNeedingDistractor) {
  const categorySlug = question.category?.slug || 'geographie';
  const pool = extraDistractors[categorySlug];
  
  // Vérifier qu'on n'a pas déjà ce distractor
  const existing = [
    ...question.distractors.map(d => d.distractorText.toLowerCase()),
    ...question.acceptedAnswers.map(a => a.answer.toLowerCase()),
  ];
  
  // Trouver un distractor valide
  const newDistractor = pool.find(d => !existing.includes(d.toLowerCase()));
  
  if (newDistractor) {
    await prisma.distractor.create({
      data: {
        questionId: question.id,
        distractorText: newDistractor,
        order: 4,
        plausibilityScore: 75,
      },
    });
    console.log(`✅ Added "${newDistractor}" to "${question.text}"`);
  } else {
    console.log(`⚠️  No valid distractor found for "${question.text}"`);
  }
}
```

### Bonnes pratiques pour les distractors

**1. Cohérence de catégorie**

Les 4 distractors doivent appartenir à la même famille que la bonne réponse :

```
✅ Bon exemple (Capitales)
Question: "Quelle est la capitale de la France ?"
Réponse: Paris
Distractors: Londres, Berlin, Rome, Madrid  ← Toutes des capitales

❌ Mauvais exemple
Question: "Quelle est la capitale de la France ?"
Réponse: Paris
Distractors: Londres, Voiture, 42, Pizza  ← Incohérent
```

**2. Plausibilité graduée**

```
Question: "Qui a peint La Joconde ?"
Réponse: Léonard de Vinci

Distractors (par plausibilité) :
1. Michel-Ange          (plausibilityScore: 90) ← Même époque, même pays
2. Raphaël              (plausibilityScore: 85) ← Renaissance italienne
3. Botticelli           (plausibilityScore: 75) ← Renaissance, mais moins connu
4. Pablo Picasso        (plausibilityScore: 50) ← Peintre célèbre, mais époque différente
```

**3. Éviter les doublons sémantiques**

```
❌ Mauvais
Réponse: Paris
Distractors: Ville de Paris, Paris France, Paris (capitale), Paris (ville)

✅ Bon
Réponse: Paris
Distractors: Londres, Berlin, Rome, Madrid
```

### Workflow de création de question PVP

```
1. ✅ Créer la question avec le texte
2. ✅ Ajouter la bonne réponse (AcceptedAnswer)
3. ✅ Ajouter EXACTEMENT 4 distractors plausibles
4. ✅ Vérifier la cohérence de catégorie
5. ✅ Définir enabledForMcq = true
6. ✅ Tester dans un match PVP
```

### Checklist avant publication

Pour chaque question PVP MCQ :

- [ ] La question a **exactement 4 distractors** (pas 3, pas 5)
- [ ] Tous les distractors sont de la **même catégorie** que la réponse
- [ ] Aucun distractor n'est une **variante** de la bonne réponse
- [ ] Les distractors sont **plausibles** (pas évidemment faux)
- [ ] `enabledForMcq = true` est défini
- [ ] Testé dans un match PVP sans erreur "Invalid questions"

### Commandes utiles

**Vérifier le nombre de distractors par question :**
```bash
cd apps/backend
npx tsx -e "
import { getPrismaClient } from './scripts/utils/db';
const prisma = getPrismaClient();
(async () => {
  const questions = await prisma.question.findMany({
    where: { enabledForMcq: true },
    include: { distractors: true },
  });
  
  const distribution = {};
  questions.forEach(q => {
    const count = q.distractors.length;
    distribution[count] = (distribution[count] || 0) + 1;
  });
  
  console.log('Distribution des distractors (questions MCQ):');
  Object.entries(distribution).forEach(([count, num]) => {
    const status = count === '4' ? '✅' : '❌';
    console.log(\`  \${status} \${count} distractors: \${num} questions\`);
  });
  
  await prisma.\$disconnect();
})();
"
```

**Résultat attendu :**
```
Distribution des distractors (questions MCQ):
  ✅ 4 distractors: 60 questions
```

### Leçon apprise

> **Le mode PVP nécessite une validation stricte des questions. Toujours vérifier le nombre de distractors AVANT d'activer `enabledForMcq: true`.**

**Pourquoi :**
- Un match PVP annulé cause une mauvaise UX pour les deux joueurs
- Les joueurs perdent leur temps (attente matchmaking + chargement)
- Peut causer une perte de confiance dans le système
- Facile à prévenir avec un script de vérification

---

## 📈 Statistiques Pipeline (Référence)

**Résultat actuel :**
- ✅ 169/180 images téléchargées (93.9%)
- 🚫 21 questions désactivées (11.7%)
- 💾 12.20 MB stockage total

**Principales causes d'échec :**
- 9 tableaux (trop lourds ou supprimés)
- 4 personnages d'anime (copyright)
- 3 artistes (photos récentes supprimées)
- 2 jeux vidéo (copyright)
- 3 autres (réalisateur, entraîneur)

**Recommandation :** Privilégier drapeaux, animaux, plantes, monuments pour maximiser le taux de réussite.

---

**Dernière mise à jour :** 2026-10-17  
**Pipeline version :** 2.0 (2 phases + fallback automatique)  
**Ajouts :** Règle critique des 4 distractors pour mode PVP
