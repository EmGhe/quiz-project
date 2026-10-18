# Module QUESTIONS - Gestion des questions

## Rôle du module

Le module QUESTIONS gère le **contenu pédagogique** de l'application Quiz : les questions, leurs réponses acceptées, leurs distracteurs (pour les MCQ), et les métadonnées associées.

**Responsabilités** :
- **Stockage** et structuration des questions
- **Validation** des questions (via le module ADMIN)
- **Catégorisation** et difficulté
- **Gestion des variantes de réponses** acceptées
- **Gestion des distracteurs** pour les questions à choix multiples (MCQ)
- **Traçabilité** via les faits sources (table `Fact`)
- **Métadonnées** : statistiques de réussite, signalements utilisateurs

**Ce que le module ne gère PAS** :
- **Distribution des questions** aux joueurs (géré par DAILY et PVP)
- **Scoring** des réponses (géré par DAILY et PVP)
- **Génération automatique** de questions (scripts séparés)
- **Authentification** (géré par AUTH)

---

## Architecture générale

```
┌──────────────────────────────────┐
│   Base de données                │
│   - questions                    │
│   - accepted_answers             │
│   - distractors                  │
│   - faits (source de vérité)     │
│   - categories                   │
│   - question_metadata            │
└────────┬─────────────────────────┘
         │
         │ Scripts de génération (offline)
         │
┌────────▼─────────────────────────┐
│   Scripts                        │
│   - generate/*.ts                │
│   - cleanup/*.ts                 │
│   - qa/*.ts                      │
└──────────────────────────────────┘
         │
         │ Questions créées/validées
         │
┌────────▼─────────────────────────┐
│   Module ADMIN (backend)         │
│   - AdminController              │
│   - AdminService                 │
│   - Protection: AdminGuard       │
└────────┬─────────────────────────┘
         │
         │ GET /api/admin/questions
         │ PATCH /api/admin/questions/:id
         │ POST /api/admin/questions/:id/answers
         │
┌────────▼─────────────────────────┐
│   Frontend ADMIN                 │
│   - AdminQuestions               │
│   - AdminQuestionDetail          │
│   - AdminReportedQuestions       │
└────────┬─────────────────────────┘
         │
         │ Modification / validation
         │
┌────────▼─────────────────────────┐
│   Module QUESTIONS (backend)     │
│   - QuestionsController          │
│   - QuestionsService             │
│   - Route publique               │
└────────┬─────────────────────────┘
         │
         │ GET /api/questions (liste publique)
         │
┌────────▼─────────────────────────┐
│   Modules consommateurs          │
│   - DAILY (sélection questions)  │
│   - PVP (sélection questions)    │
│   - COLLECTION (liaison entités) │
└──────────────────────────────────┘
```

---

## Frontend

### Pages d'administration

#### 1. **AdminQuestions.tsx**

**Rôle** : Liste paginée des questions avec filtres.

**Localisation** : `apps/frontend/src/pages/admin/AdminQuestions.tsx`

**Fonctionnalités** :
- **Pagination** (20 questions par page)
- **Filtres** : statut, catégorie, difficulté, recherche texte
- **Filtres avancés** : `enabledForDaily`, `enabledForMcq`
- **Vue rapide** : texte de la question, catégorie, difficulté, réponse primaire, nombre de variantes, nombre de distracteurs
- **Actions** : clic sur une question → détail

**Appels API** :
```typescript
GET /api/admin/questions?page=1&limit=20&status=publie&category=...&difficulty=...&search=...&enabledForDaily=true&enabledForMcq=false
```

**Données affichées** :
- Texte de la question
- Catégorie
- Difficulté
- Statut (brouillon, publié, archivé)
- Réponse primaire
- Nombre de variantes acceptées
- Nombre de distracteurs

---

#### 2. **AdminQuestionDetail.tsx**

**Rôle** : Page de détail et modification d'une question.

**Localisation** : `apps/frontend/src/pages/admin/AdminQuestionDetail.tsx`

**Fonctionnalités** :
- **Modification** du texte de la question
- **Modification** de la difficulté, catégorie, statut
- **Toggle** `enabledForDaily` / `enabledForMcq`
- **Gestion des réponses acceptées** :
  - Modification de la réponse primaire
  - Ajout de variantes (avec seuil de Levenshtein)
  - Suppression de variantes
- **Gestion des distracteurs** (MCQ) :
  - Ajout de distracteurs
  - Modification de distracteurs existants
  - Suppression de distracteurs
- **Affichage du fait source** (traçabilité)

**Appels API** :
```typescript
GET    /api/admin/questions/:id
PATCH  /api/admin/questions/:id
PATCH  /api/admin/questions/:id/primary-answer
POST   /api/admin/questions/:id/answers
DELETE /api/admin/answers/:id
POST   /api/admin/questions/:id/distractors
PATCH  /api/admin/distractors/:id
DELETE /api/admin/distractors/:id
```

**Point important** : Cette page permet de valider et corriger les questions générées par les scripts.

---

#### 3. **AdminReportedQuestions.tsx**

**Rôle** : Liste des questions signalées par les utilisateurs.

**Localisation** : `apps/frontend/src/pages/admin/AdminReportedQuestions.tsx`

**Fonctionnalités** :
- **Liste** des questions avec au moins 1 signalement
- **Tri** par nombre de signalements (décroissant)
- **Affichage** des raisons de signalement
- **Actions** :
  - `Dismiss` : effacer les signalements (question OK)
  - `Archive` : archiver la question et effacer les signalements
  - `Fix` : garder les signalements, correction manuelle

**Appels API** :
```typescript
GET  /api/admin/reported-questions?limit=50&minReports=1
POST /api/admin/reported-questions/:questionId/resolve
```

**Note** : Les signalements proviennent de `questionMetadata.userReports` (géré par DAILY et PVP).

---

#### 4. **AdminDashboard.tsx**

**Rôle** : Vue d'ensemble des statistiques sur les questions.

**Localisation** : `apps/frontend/src/pages/admin/AdminDashboard.tsx`

**Statistiques affichées** :
- **Total** de questions
- Questions **publiées**, **brouillons**, **archivées**
- Répartition par **catégorie**
- **Taux de réussite moyen** par catégorie
- Alertes :
  - Questions trop faciles (> 95% de réussite)
  - Questions trop difficiles (< 10% de réussite)

**Appel API** :
```typescript
GET /api/admin/stats
```

---

### API Client : questionsApi

**Rôle** : API publique de consultation des questions (non utilisée dans l'implémentation actuelle).

**Localisation** : `apps/frontend/src/api/questions.ts`

**Méthodes** :
```typescript
getAll(page, limit): Promise<PaginatedResponse<Question>>
```

**Note** : Cette API retourne uniquement les questions avec `status = 'publie'`. Elle n'est actuellement utilisée par aucune page frontend (les modules DAILY et PVP chargent les questions côté backend).

---

## Backend

### Module QUESTIONS (public)

#### QuestionsController

**Rôle** : Route publique de consultation des questions.

**Localisation** : `apps/backend/src/modules/questions/questions.controller.ts`

**Routes** :

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/questions` | Liste paginée des questions publiées |

**Exemple** :
```
GET /api/questions?page=1&limit=20
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "data": [ /* liste de questions */ ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

**Point important** : Seules les questions avec `status = 'publie'` sont retournées.

---

#### QuestionsService

**Rôle** : Logique métier de récupération des questions.

**Localisation** : `apps/backend/src/modules/questions/questions.service.ts`

**Méthodes** :

##### `findAll(page, limit)`

1. Calcule l'offset : `skip = (page - 1) * limit`
2. Récupère les questions publiées (`status = 'publie'`)
3. Trie par date de création (décroissant)
4. Compte le total de questions publiées
5. Retourne `{ data, total, page, limit }`

**Utilisation actuelle** : Cette méthode n'est pas utilisée par le frontend. Les modules DAILY et PVP sélectionnent les questions directement côté backend.

---

### Module ADMIN (gestion)

#### AdminController

**Rôle** : Routes d'administration des questions, protégées par `AdminGuard`.

**Localisation** : `apps/backend/src/modules/admin/admin.controller.ts`

**Protection** : Toutes les routes sont protégées par :
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

**Routes principales** :

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/admin/stats` | Statistiques dashboard |
| `GET` | `/api/admin/questions` | Liste paginée avec filtres |
| `GET` | `/api/admin/questions/:id` | Détail d'une question |
| `PATCH` | `/api/admin/questions/:id` | Modification d'une question |
| `PATCH` | `/api/admin/questions/:id/primary-answer` | Modification réponse primaire |
| `POST` | `/api/admin/questions/:id/answers` | Ajout variante réponse |
| `DELETE` | `/api/admin/answers/:id` | Suppression variante |
| `POST` | `/api/admin/questions/:id/distractors` | Ajout distracteur |
| `PATCH` | `/api/admin/distractors/:id` | Modification distracteur |
| `DELETE` | `/api/admin/distractors/:id` | Suppression distracteur |
| `GET` | `/api/admin/reported-questions` | Questions signalées |
| `POST` | `/api/admin/reported-questions/:questionId/resolve` | Résolution signalement |
| `GET` | `/api/admin/categories` | Liste des catégories |

---

#### AdminService

**Rôle** : Logique métier d'administration des questions.

**Localisation** : `apps/backend/src/modules/admin/admin.service.ts`

**Méthodes principales** :

##### `getDashboardStats()`

Retourne les statistiques globales :
- Total de questions
- Questions par statut (publié, brouillon, archivé)
- Répartition par catégorie avec taux de réussite moyen
- Alertes : questions trop faciles/difficiles

**Requêtes** :
- 4 `count()` pour les statuts
- 1 `groupBy` pour les statistiques par catégorie
- Jointure avec `category` pour obtenir les noms

---

##### `getQuestions(params)`

Liste paginée avec filtres multiples.

**Filtres supportés** :
- `status` : brouillon, publié, archivé
- `category` : ID de catégorie
- `difficulty` : facile, moyen, difficile
- `search` : recherche textuelle dans `question.text`
- `enabledForDaily` : boolean
- `enabledForMcq` : boolean

**Inclusions** :
- `category` (nom de la catégorie)
- `acceptedAnswers` (uniquement la réponse primaire)
- `_count` : nombre de réponses acceptées et de distracteurs

**Tri** : `createdAt DESC`

---

##### `getQuestion(id)`

Détail complet d'une question.

**Inclusions** :
- `category`
- `fact` + `source` (traçabilité)
- `acceptedAnswers` (toutes les variantes)
- `distractors` (triés par `order ASC`)

---

##### `updateQuestion(id, data)`

Modifie une question.

**Champs modifiables** :
- `text`
- `difficulty`
- `status`
- `categoryId`
- `enabledForDaily`
- `enabledForMcq`

**Note** : La modification du texte ne vérifie pas l'unicité. Cela pourrait créer des doublons si un administrateur n'est pas prudent.

---

##### `addAnswerVariant(questionId, answer, levenshteinThreshold)`

Ajoute une variante de réponse acceptée.

**Paramètres** :
- `answer` : texte de la variante
- `levenshteinThreshold` : distance de Levenshtein maximale (par défaut : 2)

**Création** :
```prisma
AcceptedAnswer {
  questionId,
  answer,
  isPrimary: false,
  variantType: 'orthographe',
  levenshteinThreshold
}
```

**Point important** : Les variantes sont marquées `isPrimary = false`. Une seule réponse par question a `isPrimary = true`.

---

##### `updatePrimaryAnswer(questionId, newAnswer)`

Modifie la réponse primaire d'une question.

**Process** :
1. Récupère la réponse primaire (`isPrimary = true`)
2. Met à jour son texte
3. Conserve `isPrimary = true`

---

##### `addDistractor(questionId, text, order?)`

Ajoute un distracteur pour les MCQ.

**Process** :
1. Récupère les distracteurs existants
2. Détermine l'ordre suivant (ou utilise `order` fourni)
3. Crée le distracteur avec `plausibilityScore = 0.5` (non utilisé actuellement)

**Note** : L'ordre est unique par question (`@@unique([questionId, order])` dans Prisma).

---

##### `getReportedQuestions(params)`

Liste les questions signalées par les utilisateurs.

**Filtres** :
- `limit` : nombre max de résultats (par défaut : 50)
- `minReports` : nombre minimum de signalements (par défaut : 1)

**Source** : Table `QuestionMetadata` avec `reportCount >= minReports`

**Tri** : `reportCount DESC`

**Retour** :
```typescript
{
  questionId,
  question: text,
  category: name,
  reportCount,
  reports: userReports (JSON),
  status
}
```

---

##### `resolveReport(questionId, action)`

Résout un signalement.

**Actions** :

| Action | Comportement |
|--------|--------------|
| `dismiss` | Efface les signalements (question OK) |
| `archive` | Archive la question + efface les signalements |
| `fix` | Garde les signalements, permet correction manuelle |

**Process** :
- `dismiss` : met `userReports = []` et `reportCount = 0`
- `archive` : met `status = 'archive'` + efface les signalements
- `fix` : ne fait rien (les signalements restent pour suivi)

---

### AdminGuard

**Rôle** : Vérifie que l'utilisateur connecté est un administrateur.

**Localisation** : `apps/backend/src/common/guards/admin.guard.ts`

**Fonctionnement actuel** : **Non implémenté**.

**Problème** : Le guard existe mais **n'effectue aucune vérification**. Tous les utilisateurs authentifiés peuvent accéder aux routes d'administration.

**Amélioration nécessaire** :
1. Ajouter un champ `role` ou `isAdmin` dans la table `User`
2. Vérifier ce champ dans le guard
3. Lancer `ForbiddenException` si l'utilisateur n'est pas admin

---

## Base de données

### Table : `questions`

**Rôle** : Stocke toutes les questions du quiz.

**Schéma Prisma** :
```prisma
model Question {
  id                    String    @id @default(uuid())
  factId                String
  text                  String    @unique
  questionType          String    @default("texte")
  mediaUrl              String?
  mediaType             String?
  mediaLicenseAuthor    String?
  mediaLicenseType      String?
  mediaLicenseUrl       String?
  mediaSourceUrl        String?
  difficulty            String?
  difficultyScore       Int?
  categoryId            String?
  qualityScore          Int?
  ambiguous             Boolean   @default(false)
  displayCount          Int       @default(0)
  correctAnswersCount   Int       @default(0)
  incorrectAnswersCount Int       @default(0)
  successRate           Decimal?  @db.Decimal(5, 2)
  status                String    @default("brouillon")
  enabledForDaily       Boolean   @default(true)
  enabledForMcq         Boolean   @default(false)
  validatedBy           String?
  validatedAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  fact            Fact
  category        Category?
  acceptedAnswers AcceptedAnswer[]
  distractors     Distractor[]
  metadata        QuestionMetadata?
  duplicates1     DetectedDuplicate[] @relation("Question1")
  duplicates2     DetectedDuplicate[] @relation("Question2")
  dailyQuestions  DailyQuestion[]
}
```

**Champs importants** :

| Champ | Rôle |
|-------|------|
| `factId` | Lien vers le fait source (traçabilité) |
| `text` | Texte de la question (unique) |
| `questionType` | `texte`, `image`, `carte` |
| `mediaUrl` | URL du média (image, carte) |
| `difficulty` | `facile`, `moyen`, `difficile` |
| `categoryId` | Catégorie de la question |
| `status` | `brouillon`, `valide`, `publie`, `archive` |
| `enabledForDaily` | Utilisable pour le Daily |
| `enabledForMcq` | Utilisable pour les MCQ |
| `displayCount` | Nombre de fois affichée |
| `successRate` | Taux de réussite (%) |

**Statuts** :
- `brouillon` : question créée mais non validée
- `valide` : validée mais non publiée
- `publie` : visible par les joueurs
- `archive` : retirée de la circulation

**Point important** : Le champ `text` est unique. Deux questions ne peuvent pas avoir le même texte.

---

### Table : `accepted_answers`

**Rôle** : Variantes de réponses acceptées pour une question (mode Daily).

**Schéma Prisma** :
```prisma
model AcceptedAnswer {
  id                   String   @id @default(uuid())
  questionId           String
  answer               String
  isPrimary            Boolean  @default(false)
  variantType          String?
  levenshteinThreshold Int      @default(2)
  createdAt            DateTime @default(now())

  question Question @relation(...)
}
```

**Champs importants** :

| Champ | Rôle |
|-------|------|
| `answer` | Texte de la réponse |
| `isPrimary` | `true` pour la réponse principale, `false` pour les variantes |
| `variantType` | `exacte`, `accent`, `abreviation`, `orthographe` |
| `levenshteinThreshold` | Distance max pour accepter la réponse |

**Utilisation** : Le module DAILY compare la réponse du joueur avec toutes les `AcceptedAnswer` de la question.

**Exemple** :
```
Question: Quelle est la capitale de la France ?
- AcceptedAnswer(isPrimary=true): "Paris"
- AcceptedAnswer(isPrimary=false, variantType='orthographe'): "paris" (levenshtein=1)
```

---

### Table : `distractors`

**Rôle** : Mauvaises réponses pour les questions MCQ.

**Schéma Prisma** :
```prisma
model Distractor {
  id                String   @id @default(uuid())
  questionId        String
  distractorText    String
  wikidataSourceId  String?
  plausibilityScore Int?
  order             Int
  createdAt         DateTime @default(now())

  question Question @relation(...)

  @@unique([questionId, order])
}
```

**Champs importants** :

| Champ | Rôle |
|-------|------|
| `distractorText` | Texte de la mauvaise réponse |
| `order` | Position (1-4) dans le MCQ |
| `wikidataSourceId` | ID Wikidata de l'entité source (traçabilité) |
| `plausibilityScore` | Score de plausibilité (non utilisé actuellement) |

**Contrainte** : L'ordre est unique par question. Un MCQ typique a 4 distracteurs (order 1-4) + 1 bonne réponse.

---

### Table : `faits` (Fact)

**Rôle** : Source de vérité pour les questions.

**Schéma Prisma** :
```prisma
model Fact {
  id               String   @id @default(uuid())
  subject          String
  property         String
  object           String
  sourceId         String
  sourceReference  String?
  lastVerification DateTime @default(now())
  categoryId       String?
  tags             String[]
  geoRegion        String?
  data             Json?
  interestScore    Int?
  active           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdBy        String?

  source    Source
  category  Category?
  questions Question[]
  history   FactHistory[]

  @@unique([subject, property, object])
}
```

**Point fondamental** : Une question doit **toujours** être liée à un fait vérifiable.

**Exemple** :
```
Fact:
  subject: "France"
  property: "capital"
  object: "Paris"
  sourceId: "wikidata"
  sourceReference: "Q90"

Question (dérivée):
  "Quelle est la capitale de la France ?"
```

**Traçabilité** : Chaque question inclut `factId`, permettant de retrouver la source du fait.

---

### Table : `categories`

**Rôle** : Catégorisation des questions.

**Schéma Prisma** :
```prisma
model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  parentId    String?
  icon        String?
  createdAt   DateTime @default(now())

  parent    Category?  @relation("CategoryHierarchy", ...)
  children  Category[] @relation("CategoryHierarchy")
  facts     Fact[]
  questions Question[]
}
```

**Hiérarchie** : Les catégories peuvent avoir des sous-catégories (`parentId`).

**Exemples** :
- Géographie
  - Europe
  - Amérique
  - Asie
- Sciences
  - Biologie
  - Physique
  - Chimie

---

### Table : `question_metadata`

**Rôle** : Métadonnées et statistiques sur les questions.

**Schéma Prisma** :
```prisma
model QuestionMetadata {
  id          String    @id @default(uuid())
  questionId  String    @unique
  successRate Decimal?  @db.Decimal(5, 2)
  avgTimeMs   Int?
  timesAsked  Int       @default(0)
  skipRate    Decimal?  @db.Decimal(5, 2)
  userReports Json?
  reportCount Int       @default(0)
  lastAsked   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  question Question @relation(...)
}
```

**Champs importants** :

| Champ | Rôle |
|-------|------|
| `successRate` | % de bonnes réponses |
| `avgTimeMs` | Temps moyen de réponse |
| `timesAsked` | Nombre de fois posée |
| `userReports` | JSON des signalements utilisateurs |
| `reportCount` | Nombre de signalements |
| `lastAsked` | Dernière utilisation |

**Signalements** :
```json
{
  "userReports": [
    {
      "userId": "uuid",
      "reason": "Mauvaise réponse",
      "timestamp": "2026-10-17T...",
      "comment": "La réponse est obsolète"
    }
  ]
}
```

---

## Scripts de génération

### Architecture

**Localisation** : `apps/backend/scripts/`

**Organisation** :
```
scripts/
├── generate/         # Génération de questions
├── cleanup/          # Nettoyage de questions problématiques
├── qa/               # Contrôle qualité
├── fixes/            # Corrections ponctuelles
└── utils/            # Utilitaires partagés
```

**Point important** : Les scripts sont **exécutés manuellement**, pas via l'API. Ils utilisent Prisma directement.

---

### Processus de génération

**Exemple** : `generate/faune-questions.ts`

1. **Récupération des faits** depuis Wikidata ou autre source
2. **Création d'un `Fact`** avec traçabilité
3. **Génération de la question** selon un template
4. **Création des `AcceptedAnswer`** (réponse primaire + variantes)
5. **Génération des distracteurs** (pour MCQ) via requêtes Wikidata
6. **Validation** : vérification des contraintes de qualité
7. **Insertion** en base avec `status = 'brouillon'`

**Validation manuelle** : Les questions générées sont ensuite validées via l'interface ADMIN avant publication.

---

### Templates de questions

**Localisation** : `scripts/utils/question-templates.ts`

**Rôle** : Fournit des modèles de questions réutilisables.

**Exemples** :
```typescript
// Capitale d'un pays
"Quelle est la capitale de {pays} ?"

// Auteur d'une œuvre
"Qui a écrit {œuvre} ?"

// Année d'un événement
"En quelle année {événement} ?"
```

**Variabilité** : Les templates permettent de générer des questions cohérentes et naturelles.

---

### Scripts de nettoyage

**Exemples** :
- `cleanup/delete-numeric-questions.ts` : Supprime les questions avec des chiffres précis (population, altitude, etc.)
- `cleanup/delete-vague-history-questions.ts` : Supprime les questions trop vagues
- `cleanup/delete-mer-borde-questions.ts` : Supprime les questions "Quelle mer borde..." (trop ambiguës)

**Principe** : Les scripts de nettoyage corrigent les erreurs de génération automatique.

---

### Scripts de contrôle qualité

**Exemple** : `qa/check-all-image-questions.ts`

**Rôle** : Vérifie que toutes les questions de type `image` ont bien un `mediaUrl` valide.

**Process** :
1. Récupère toutes les questions avec `questionType = 'image'`
2. Vérifie que `mediaUrl` n'est pas `null`
3. Tente de charger l'image (HTTP HEAD request)
4. Signale les URLs cassées

---

## Flux fonctionnels

### Flux 1 : Création d'une question (via script)

```
┌─────────────────────────┐
│   Script de génération  │
│   (ex: faune-questions) │
└────────┬────────────────┘
         │
         │ 1. Récupération des faits (Wikidata)
         │
┌────────▼────────────────┐
│   Fact créé             │
│   - subject: "Lion"     │
│   - property: "habitat" │
│   - object: "Savane"    │
│   - sourceId: wikidata  │
└────────┬────────────────┘
         │
         │ 2. Génération template
         │ "Quel est l'habitat principal du lion ?"
         │
┌────────▼────────────────┐
│   Question créée        │
│   - text: "Quel est..." │
│   - factId: ...         │
│   - status: brouillon   │
│   - category: Faune     │
└────────┬────────────────┘
         │
         │ 3. Création réponses
         │
┌────────▼────────────────┐
│   AcceptedAnswer créées │
│   - "Savane" (primary)  │
│   - "savane" (variant)  │
│   - "La savane" (var.)  │
└────────┬────────────────┘
         │
         │ 4. Génération distracteurs (si MCQ)
         │
┌────────▼────────────────┐
│   Distractor créés      │
│   - "Forêt tropicale"   │
│   - "Désert"            │
│   - "Toundra"           │
│   - "Montagne"          │
└────────┬────────────────┘
         │
         │ Question en base, status=brouillon
         │
┌────────▼────────────────┐
│   Validation manuelle   │
│   via ADMIN             │
└─────────────────────────┘
```

---

### Flux 2 : Validation d'une question (ADMIN)

```
┌─────────────────────────┐
│   Administrateur        │
└────────┬────────────────┘
         │
         │ Accède à AdminQuestions
         │
┌────────▼────────────────┐
│   Frontend              │
│   GET /api/admin/       │
│   questions?status=     │
│   brouillon             │
└────────┬────────────────┘
         │
         │ Liste des brouillons
         │
┌────────▼────────────────┐
│   Admin sélectionne     │
│   une question          │
└────────┬────────────────┘
         │
         │ GET /api/admin/questions/:id
         │
┌────────▼────────────────┐
│   AdminQuestionDetail   │
│   - Affiche question    │
│   - Affiche fact source │
│   - Affiche réponses    │
│   - Affiche distracteurs│
└────────┬────────────────┘
         │
         │ Admin vérifie et modifie
         │ - Corrige texte si besoin
         │ - Ajuste réponses
         │ - Vérifie distracteurs
         │
┌────────▼────────────────┐
│   Validation            │
│   PATCH /api/admin/     │
│   questions/:id         │
│   { status: 'publie' }  │
└────────┬────────────────┘
         │
         │ Question publiée
         │
┌────────▼────────────────┐
│   Question disponible   │
│   pour DAILY et PVP     │
└─────────────────────────┘
```

---

### Flux 3 : Signalement d'une question (utilisateur)

```
┌─────────────────────────┐
│   Joueur                │
│   répond au Daily       │
└────────┬────────────────┘
         │
         │ Question semble incorrecte
         │
┌────────▼────────────────┐
│   Frontend              │
│   POST /api/daily/      │
│   questions/:id/report  │
│   { reason: "...",      │
│     comment: "..." }    │
└────────┬────────────────┘
         │
         │ (Géré par module DAILY)
         │
┌────────▼────────────────┐
│   Backend               │
│   - Ajoute au JSON      │
│     userReports         │
│   - Incrémente          │
│     reportCount         │
└────────┬────────────────┘
         │
         │ Question signalée
         │
┌────────▼────────────────┐
│   QuestionMetadata      │
│   reportCount++         │
└────────┬────────────────┘
         │
         │ Admin vérifie régulièrement
         │
┌────────▼────────────────┐
│   AdminReportedQuestions│
│   GET /api/admin/       │
│   reported-questions    │
└────────┬────────────────┘
         │
         │ Admin décide
         │
┌────────▼────────────────┐
│   POST /api/admin/      │
│   reported-questions/   │
│   :id/resolve           │
│   { action: 'archive' } │
└────────┬────────────────┘
         │
         │ Question archivée
         │
┌────────▼────────────────┐
│   Question retirée      │
│   de la circulation     │
└─────────────────────────┘
```

---

## Dépendances entre modules

```
QUESTIONS
 ├── Utilise : AUTH (AdminGuard pour protection)
 ├── Fournit des données à : DAILY, PVP, COLLECTION
 ├── Dépend de : Fact, Source, Category (architecture de contenu)
 └── Géré par : ADMIN (validation, modification)
```

**Modules consommateurs** :
- **DAILY** : sélectionne 10 questions par jour
- **PVP** : sélectionne 10 questions par match
- **ADMIN** : gère validation et métadonnées
- **COLLECTION** : lie les entités aux questions (cards)

**Point important** : Le module QUESTIONS est le **cœur du contenu**. Sans questions valides, les modules DAILY et PVP ne peuvent pas fonctionner.

---

## Gestion des erreurs

### Erreurs backend

| Code | Cas | Message |
|------|-----|---------|
| `400 Bad Request` | Données invalides | Détails validation |
| `401 Unauthorized` | Token manquant/invalide | "No token provided" |
| `403 Forbidden` | Non admin (théorique) | "Forbidden" |
| `404 Not Found` | Question inexistante | "Question not found" |
| `500 Internal Server Error` | Erreur base de données | Message générique |

### Erreurs scripts

Les scripts utilisent des `try/catch` et loggent les erreurs dans la console. Aucune gestion d'erreur centralisée.

**Amélioration potentielle** : Logger les erreurs dans un fichier ou service de monitoring.

---

## Sécurité

### Mécanismes présents

#### 1. **Protection des routes admin**

Toutes les routes `/api/admin/*` sont protégées par :
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

**Problème** : `AdminGuard` n'est pas implémenté. Tous les utilisateurs authentifiés peuvent accéder aux routes admin.

---

#### 2. **Validation des données**

Les DTOs (non présents dans ce module) devraient valider les entrées. Actuellement, la validation repose sur Prisma (contraintes de schéma).

---

#### 3. **Contraintes base de données**

- `question.text` : unique (évite les doublons exacts)
- `distractor.order` : unique par question
- `AcceptedAnswer` : lien cascade avec Question (suppression automatique)

---

### Points d'attention

#### 1. **AdminGuard non implémenté**

**Problème** : Tous les utilisateurs peuvent modifier et valider les questions.

**Risque** : Sabotage du contenu, modification malveillante.

**Solution** :
1. Ajouter un champ `role` ou `isAdmin` dans `User`
2. Implémenter la vérification dans `AdminGuard`
3. Restreindre l'accès aux vrais administrateurs

---

#### 2. **Pas de vérification d'unicité lors de la modification du texte**

**Problème** : Un admin peut modifier le texte d'une question et créer un doublon.

**Solution** : Vérifier l'unicité avant de sauvegarder.

---

#### 3. **Suppression de variantes sans vérification**

**Problème** : Un admin peut supprimer toutes les réponses acceptées, y compris la réponse primaire.

**Solution** : Empêcher la suppression de la réponse primaire.

---

#### 4. **Pas de validation des distracteurs**

**Problème** : Un distracteur peut être identique à la bonne réponse.

**Solution** : Vérifier que le distracteur n'est pas dans `acceptedAnswers` avant de l'ajouter.

---

#### 5. **Scripts non protégés**

**Problème** : Les scripts accèdent directement à la base de données sans authentification ni autorisation.

**Risque** : Un script malveillant peut supprimer tout le contenu.

**Solution** : Isoler les scripts dans un environnement protégé, avec audit des modifications.

---

## À retenir

1. **Le module QUESTIONS est le cœur du contenu pédagogique**. Toutes les questions doivent être liées à un `Fact` vérifiable.

2. **Les questions sont générées par des scripts** (offline), puis validées manuellement via l'interface ADMIN.

3. **Trois types de questions** : `texte`, `image`, `carte`.

4. **Deux modes de jeu** : Daily (réponse libre avec variantes) et MCQ (choix multiples avec distracteurs).

5. **Le statut d'une question détermine sa visibilité** : `brouillon` → `publie` → `archive`.

6. **Les réponses acceptées utilisent la distance de Levenshtein** pour tolérer les fautes de frappe.

7. **Les distracteurs doivent être plausibles** mais clairement faux. Ils sont ordonnés (1-4).

8. **Les métadonnées permettent de suivre les performances** : taux de réussite, temps moyen, signalements.

9. **L'AdminGuard n'est pas implémenté** : tous les utilisateurs authentifiés peuvent accéder aux routes admin.

10. **La traçabilité est assurée** par le lien `Question → Fact → Source`.

---

## Points d'amélioration potentiels

1. **Implémenter AdminGuard** : Restreindre l'accès aux vraies administrateurs.

2. **Validation de l'unicité du texte** lors de la modification.

3. **Validation des distracteurs** : éviter les doublons avec la bonne réponse.

4. **Empêcher la suppression de la réponse primaire** sans replacement.

5. **API de génération de questions** : Permettre la génération via API au lieu de scripts CLI.

6. **Audit des modifications** : Logger qui modifie quoi et quand.

7. **Workflow de validation** : Implémenter un système de review (brouillon → en révision → validé → publié).

8. **Détection automatique de doublons** : Utiliser la similarité textuelle pour détecter les questions similaires.

9. **Gestion des versions** : Historiser les modifications de questions.

10. **Automatisation des tests de qualité** : Exécuter les scripts QA en CI/CD.
