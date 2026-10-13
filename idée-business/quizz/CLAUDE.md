# CLAUDE.md

## Règle principale

Le repository est la source de vérité. Ne te base pas sur l'historique des conversations pour comprendre l'état du projet.

Avant toute modification :
1. Lire ce `CLAUDE.md`.
2. Lire les fichiers directement concernés.
3. Vérifier les patterns déjà utilisés dans le projet.
4. Ne pas modifier de code sans comprendre l'implémentation existante.

Ne modifie pas de fichiers ou de comportements sans rapport avec la tâche.

---

## Projet

Plateforme de quiz destinée en priorité à un public francophone.

Stack :
- Frontend : React 18 + Vite + Tailwind CSS
- Backend : NestJS + Prisma
- DB : PostgreSQL 15
- Monorepo : pnpm workspaces

Architecture :
- Backend organisé par modules/features NestJS.
- Prisma comme ORM.
- Frontend organisé autour des pages/features/components existants.
- Zustand pour l'état global.
- Axios pour l'accès API.
- React Query est prévu pour le server state.

Toujours suivre l'architecture existante avant d'introduire une nouvelle approche.

---

## Documentation de référence

Consulter le document pertinent avant de travailler sur le sujet concerné :

- `docs/ARCHITECTURE.md` → architecture technique
- `docs/DATABASE.md` → modèle de données et principes DB
- `docs/QUESTION-QUALITY-GUIDELINES.md` → règles obligatoires de qualité
- `docs/QUESTION-INVENTORY.md` → inventaire actuel
- `docs/DECISIONS.md` → décisions prises
- `docs/ROADMAP.md` → roadmap et priorités
- `docs/SESSION-SUMMARY-{yyyy}-{mm}-{dd}.md` → état/documentation de session
- `brainstorm/stratégie_bdd_quiz.md` → stratégie de contenu

Si le code et la documentation divergent, inspecter le code actuel et ne pas inventer de résolution silencieuse.

---

## Principe fondamental du contenu

Ne jamais utiliser la mémoire du LLM comme source de vérité.

Pipeline :

```text
SOURCE FIABLE
→ FAIT STRUCTURÉ
→ QUESTION
→ RÉPONSES / DISTRACTEURS
→ VALIDATION
→ DÉTECTION AMBIGUÏTÉS / DOUBLONS
→ PUBLICATION
```

Pour MVP1–3, Wikidata est la source structurée principale documentée.

Les faits et les questions sont séparés : plusieurs questions peuvent dériver d'un même fait, mais la traçabilité vers la source doit être conservée.

---

## Audience et contenu

Public prioritaire : francophone, avec une priorité à la France.

Répartition géographique indicative :
- France : 35 %
- Europe hors France : 25 %
- Amérique du Nord : 20 %
- reste du monde : 20 %

Éviter le biais occidental ou parisien. Représenter également l'Afrique, l'Asie, l'Amérique latine, le Moyen-Orient, l'Europe de l'Est, l'Asie du Sud et du Sud-Est lorsque pertinent.

Catégories principales :
géographie, histoire, sciences, culture générale, nature/animaux, sports, cinéma, musique, séries/TV, littérature, arts, gastronomie, technologie, jeux vidéo, personnalités et culture Internet.

Difficulté cible :
- 20 % facile
- 60 % moyen
- 20 % difficile

Une question difficile doit être stimulante, pas obscure ou artificiellement précise.

---

## Règles obligatoires pour les questions

Avant toute génération ou modification de questions, lire :
`docs/QUESTION-QUALITY-GUIDELINES.md`

Une question doit être :
- factuellement exacte ;
- claire et naturelle en français ;
- objective ;
- non ambiguë ;
- basée sur un fait vérifiable ;
- suffisamment intéressante ;
- associée au bon type/catégorie de réponse.

### À éviter

- questions vagues ou descriptives sans élément distinctif ;
- réponse révélée dans la question ;
- questions subjectives ou ouvertes (`Pourquoi`, `Comment`, `Expliquez...`) ;
- chiffres précis concernant population, altitude, distance, taille, surface, poids, température, vitesse, etc. ;
- dates exactes sauf événements historiques majeurs ;
- questions dont la difficulté vient uniquement d'un détail obscur.

Les questions descriptives doivent contenir au moins un élément permettant d'identifier clairement le sujet.

La catégorie doit correspondre au **type de réponse attendu**, pas seulement au sujet de la question.

---

## Questions visuelles

Pour les questions visuelles :
- utiliser `[N]` pour distinguer les questions similaires ;
- ne jamais révéler la réponse dans le texte ;
- Wikimedia : utiliser les URLs directes, jamais `/thumb/` ;
- SVG directement pour les drapeaux ;
- JPG/PNG directs pour les photos.

---

## Réponses et distracteurs

### Daily

Le Daily utilise des réponses textuelles.

Normaliser notamment :
- casse ;
- espaces ;
- ponctuation ;
- accents/diacritiques lorsque pertinent.

Levenshtein documenté :
- ≤ 4 caractères → 1
- 5–8 → 2
- ≥ 9 → 3

N'accepter que les variantes réellement valides.

### MCQ

Un MCQ contient :
- 1 bonne réponse ;
- 4 distracteurs plausibles.

Les distracteurs doivent idéalement appartenir au même type/catégorie/famille et ne doivent jamais être :
- la bonne réponse sous une variante ;
- une réponse évidemment absurde ;
- d'un type différent ;
- un doublon.

---

## Base de données

Architecture conceptuelle :

```text
SOURCE → FACT → QUESTION → PUBLICATION
```

Avant toute modification Prisma/DB :
1. lire `apps/backend/prisma/schema.prisma` ;
2. inspecter les services/repositories concernés ;
3. suivre les conventions existantes ;
4. éviter les migrations destructives sans demande explicite.

Le schéma documenté contient notamment :
- `Question.text` unique ;
- `questionType` (`texte`, `image`, `carte`) ;
- `mediaUrl` ;
- `difficulty` ;
- `status` ;
- `enabledForDaily` / `enabledForMcq` ;
- accepted answers ;
- distractors avec un `order` unique par question.

Ne pas supposer que le schéma documenté est plus récent que le code : vérifier le fichier Prisma réel.

---

## Génération de contenu

La structure documentée des scripts suit :

```text
scripts/
├── setup/
├── ingest/
└── generate/
```

avec notamment :
- `create-{category}-categories.ts`
- `{category}-manual.ts`
- `{category}-questions.ts`
- `{category}-distractors.ts`

Suivre les scripts existants plutôt que créer une architecture parallèle.

Ne jamais contourner la couche fact/source uniquement pour générer plus rapidement.

---

## Daily

Le Daily documenté contient 10 questions.

Avant de modifier sa génération ou sa distribution :
- inspecter le service Daily actuel ;
- vérifier la logique de sélection des catégories ;
- vérifier les règles de scoring/validation existantes.

Script de développement documenté :

```bash
cd apps/backend
npm run reset:daily
```

---

## Workflow de développement

Commandes principales :

```bash
pnpm install
docker compose up -d
```

Backend :
```bash
cd apps/backend
npm run dev
```

Frontend :
```bash
cd apps/frontend
npm run dev
```

Prisma :
```bash
cd apps/backend
npx prisma studio
```

Après une modification :
- lancer les tests/checks pertinents ;
- inspecter le diff final ;
- vérifier qu'aucun fichier non concerné n'a été modifié ;
- mettre à jour la documentation si une décision ou un comportement documenté change.

---

## Documentation

Mettre à jour :
- `QUESTION-QUALITY-GUIDELINES.md` lorsqu'un nouveau problème de qualité est découvert ;
- `DECISIONS.md` lorsqu'une décision importante est prise ;
- `ROADMAP.md` lorsqu'une priorité ou étape change ;
- `QUESTION-INVENTORY.md` lorsque l'inventaire évolue de façon significative.

La documentation doit décrire l'état réel du projet, pas une intention future présentée comme déjà implémentée.

---

## Priorités

Ordre général documenté :

```text
MVP1
→ pipeline de base de questions
→ MVP2 PvP
→ V2 Collection
→ V3 Social / Marketplace
```

Ne pas commencer une fonctionnalité secondaire si une fondation nécessaire est encore incomplète, sauf demande explicite.

---

## Checklist avant publication de questions

- [ ] source/fait vérifiable
- [ ] réponse unique et objective
- [ ] question non vague
- [ ] réponse non révélée
- [ ] français naturel
- [ ] pas de précision numérique interdite
- [ ] pas de date inutilement précise
- [ ] bonne catégorie
- [ ] réponses acceptées légitimes
- [ ] 4 distracteurs plausibles pour les MCQ
- [ ] aucun doublon
- [ ] difficulté appropriée
- [ ] média vérifié pour les questions visuelles

---

## Après `/clear`

Reprendre le travail depuis le repository, pas depuis la conversation précédente.

Utiliser :

```text
Inspecte l’état actuel du dépôt et reprends le travail à partir du code présent dans le repository.

Commence par :
1. Lire CLAUDE.md
2. Examiner les fichiers pertinents
3. Comprendre l’implémentation actuelle

Ne pars d’aucune supposition basée sur la conversation précédente.

Tâche :
[TA TÂCHE]
```
