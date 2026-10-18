# Documentation du projet Quiz

## Vue d'ensemble

Cette application est une **plateforme de quiz** destinée à un public francophone, offrant plusieurs modes de jeu et un système de collection de cartes basé sur Wikidata.

**Stack technique** :
- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : NestJS + Prisma
- **Base de données** : PostgreSQL 15
- **Architecture** : Monorepo (pnpm workspaces)
- **WebSocket** : Socket.IO (pour le mode PvP)

---

## Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                 │
│  - Pages : Daily, PvP, Collection, Admin            │
│  - Stores : Zustand (auth, pvp, collection)         │
│  - API Client : Axios                               │
│  - WebSocket Client : Socket.IO                     │
└──────────────┬──────────────────────────────────────┘
               │
               │ HTTP (REST) + WebSocket
               │
┌──────────────▼──────────────────────────────────────┐
│                  Backend (NestJS)                   │
│                                                     │
│  Modules :                                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ AUTH       │ Authentification JWT + Cookies │   │
│  │ QUESTIONS  │ Gestion du contenu pédagogique │   │
│  │ DAILY      │ Quiz quotidien (10 questions)  │   │
│  │ PVP        │ Matchs 1v1 temps réel + ELO    │   │
│  │ COLLECTION │ Système de cartes Wikidata     │   │
│  │ ADMIN      │ Interface d'administration     │   │
│  │ PROXY      │ Proxy images Wikimedia + cache │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  WebSocket Gateway (PvP)                            │
│  Guards : JwtAuthGuard, AdminGuard                  │
│  Services : Prisma, AnswerValidator, ELO            │
└──────────────┬──────────────────────────────────────┘
               │
               │ Prisma ORM
               │
┌──────────────▼──────────────────────────────────────┐
│              PostgreSQL Database                    │
│                                                     │
│  Tables principales :                               │
│  - users, user_streaks, user_elo                    │
│  - questions, accepted_answers, distractors         │
│  - faits (facts), sources, categories               │
│  - dailies, daily_questions, daily_submissions      │
│  - pvp_matches, elo_history                         │
│  - entities, cards, albums, card_albums             │
│  - question_metadata (signalements)                 │
└─────────────────────────────────────────────────────┘
```

---

## Modules et leurs rôles

### 1. **AUTH** - Authentification

Gère l'inscription, la connexion, et la session utilisateur via JWT stockés dans des cookies HTTP-only.

**Fonctionnalités** :
- Inscription/Connexion
- Vérification de session (checkAuth)
- Protection des routes (JwtAuthGuard)
- Gestion des séries de participation (UserStreak)

**Documentation** : `AUTH/README.md`

---

### 2. **QUESTIONS** - Gestion du contenu

Cœur du contenu pédagogique : questions, réponses acceptées, distracteurs, traçabilité via faits sources.

**Fonctionnalités** :
- Stockage et structuration des questions
- Gestion des variantes de réponses (fuzzy matching)
- Gestion des distracteurs (MCQ)
- Traçabilité via table Fact → Source
- Métadonnées et signalements utilisateurs

**Documentation** : `QUESTIONS/README.md`

---

### 3. **DAILY** - Quiz quotidien

Génère automatiquement un quiz de 10 questions chaque jour avec sélection équilibrée par catégorie.

**Fonctionnalités** :
- Génération automatique (CRON à minuit)
- Sélection équilibrée par catégorie (2/1/proportion)
- Validation des réponses avec fuzzy matching (Levenshtein)
- Calcul du score (base + vitesse + multiplicateur streak)
- Gestion des streaks de participation
- Classement journalier

**Documentation** : `DAILY/README.md`

---

### 4. **PVP** - Player vs Player

Matchs compétitifs en temps réel 1v1 avec système de classement ELO.

**Fonctionnalités** :
- Matchmaking automatique (range ELO expansive selon temps d'attente)
- Communication WebSocket temps réel
- 10 questions MCQ, 10s par question
- Système ELO classique (K=32)
- Classement par rang : Bronze → Grandmaster
- Abandon avec pénalité

**Documentation** : `PVP/README.md`

---

### 5. **COLLECTION** - Cartes à collectionner

Système de cartes basé sur des entités Wikidata avec rareté calculée selon popularité et profondeur du contenu.

**Fonctionnalités** :
- Entités Wikidata (personnalités, lieux, œuvres)
- Calcul de rareté (40% pageviews + 60% longueur wiki)
- Albums thématiques
- Filtrage par album, rareté, recherche
- Statistiques de collection

**État** : MVP3 partiel, pas encore de système d'acquisition ou de collection utilisateur.

**Documentation** : `COLLEC/README.md`

---

### 6. **ADMIN** - Administration

Interface d'administration pour gérer les questions, catégories, et signalements.

**Fonctionnalités** :
- Validation et modification des questions
- Gestion des réponses et distracteurs
- Consultation des signalements
- Statistiques du contenu
- Dashboard

**⚠️ Vulnérabilité** : AdminGuard non implémenté, tous les utilisateurs authentifiés peuvent accéder.

**Documentation** : `ADMIN/README.md` (+ détails dans `QUESTIONS/README.md`)

---

### 7. **PROXY** - Proxy d'images

Proxifie les images Wikimedia pour contourner CORS et mettre en cache localement.

**Fonctionnalités** :
- Proxy images Wikimedia/Wikipedia
- Cache local (MD5 hash du URL)
- Headers CORS appropriés
- Whitelist stricte

**Documentation** : `PROXY/README.md`

---

## Dépendances entre modules

```
                    ┌──────────┐
                    │   AUTH   │
                    └─────┬────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
     ┌────▼────┐     ┌────▼────┐    ┌────▼────┐
     │ QUESTIONS│     │  DAILY  │    │   PVP   │
     └────┬────┘     └────┬────┘    └────┬────┘
          │               │               │
          │               └───────┬───────┘
          │                       │
     ┌────▼────┐             ┌────▼────┐
     │  ADMIN  │             │  PROXY  │
     └─────────┘             └─────────┘
          │
     ┌────▼────┐
     │COLLECTION│
     └─────────┘
```

**Légende** :
- `AUTH` → Fournit l'authentification à tous les modules
- `QUESTIONS` → Fournit le contenu à DAILY et PVP
- `ADMIN` → Gère QUESTIONS
- `PROXY` → Utilisé par QUESTIONS et COLLECTION pour les images
- `DAILY` et `PVP` → Consomment QUESTIONS

---

## Ordre de lecture recommandé

Pour comprendre progressivement le projet :

### Phase 1 : Fondations

1. **`AUTH/README.md`**
   - Comprendre l'authentification
   - JWT, cookies, guards
   - Gestion des utilisateurs

2. **`QUESTIONS/README.md`**
   - Comprendre le cœur du contenu
   - Architecture Fact → Question
   - Réponses acceptées, distracteurs
   - Génération via scripts

### Phase 2 : Modes de jeu

3. **`DAILY/README.md`**
   - Quiz quotidien
   - Génération automatique
   - Validation des réponses (fuzzy matching)
   - Système de scoring et streaks

4. **`PVP/README.md`**
   - Matchmaking temps réel
   - WebSocket
   - Système ELO
   - Matchs compétitifs

### Phase 3 : Fonctionnalités secondaires

5. **`COLLECTION/README.md`**
   - Système de cartes
   - Rareté Wikidata
   - Albums

6. **`ADMIN/README.md`**
   - Interface d'administration
   - Gestion du contenu

7. **`PROXY/README.md`**
   - Proxy d'images
   - Cache local

---

## Schéma de base de données

**Fichier de référence** : `apps/backend/prisma/schema.prisma`

**Tables principales** :

### Utilisateurs
- `users` : Comptes utilisateurs
- `user_streaks` : Séries de participation Daily
- `user_elo` : Classement ELO PvP
- `elo_history` : Historique des changements ELO

### Contenu pédagogique
- `sources` : Sources de données (Wikidata, etc.)
- `faits` : Faits vérifiables (source de vérité)
- `categories` : Catégories de questions
- `questions` : Questions du quiz
- `accepted_answers` : Variantes de réponses acceptées
- `distractors` : Mauvaises réponses (MCQ)
- `question_metadata` : Métadonnées (stats, signalements)
- `detected_duplicate` : Détection de doublons

### Daily
- `dailies` : Dailies générés
- `daily_questions` : Liaison Daily ↔ Question
- `daily_submissions` : Soumissions des joueurs

### PvP
- `pvp_matches` : Matchs 1v1
- `seasons` : Saisons compétitives
- `weekly_missions` : Missions hebdomadaires
- `mission_progress` : Progression des missions

### Collection
- `entities` : Entités Wikidata
- `cards` : Cartes dérivées des entités
- `albums` : Albums thématiques
- `card_albums` : Liaison Card ↔ Album

---

## Principes fondamentaux du projet

### 1. Source de vérité : Fact → Question

Chaque question doit être liée à un **fait vérifiable** stocké dans la table `Fact`, lui-même lié à une `Source` (Wikidata, etc.).

**Pipeline** :
```
Source → Fact → Question → Publication
```

**Avantage** : Traçabilité, vérifiabilité, possibilité de mettre à jour automatiquement si un fait change.

---

### 2. Ne jamais utiliser la mémoire du LLM

Les questions ne sont **jamais générées directement par un LLM sans source**. Le LLM peut :
- Formuler une question à partir d'un fait structuré
- Générer des distracteurs à partir d'entités similaires
- Mais ne doit pas inventer de faits

---

### 3. Deux modes de réponse

**Daily** : Saisie libre
- Le joueur tape sa réponse
- Validation avec normalisation + Levenshtein distance
- Plusieurs variantes acceptées (`Paris`, `paris`, `La Paris`, etc.)

**PvP** : MCQ (Multiple Choice Questions)
- 5 choix (1 bonne réponse + 4 distracteurs)
- Sélection d'un choix
- Pas de tolérance de faute

---

### 4. Qualité avant quantité

Les questions doivent respecter des **règles strictes** :
- Pas de chiffres précis (population, altitude, etc.)
- Pas de dates exactes sauf événements majeurs
- Pas de questions vagues ou descriptives
- Catégorie basée sur le **type de réponse** attendu, pas le sujet
- Distracteurs plausibles mais clairement faux

**Référence** : `QUESTION-QUALITY-GUIDELINES.md`

---

### 5. Workflow de validation

Les questions générées par scripts sont créées avec `status = 'brouillon'`.

**Workflow** :
1. Script génère la question
2. Admin valide et modifie si nécessaire
3. Admin publie (`status = 'publie'`)
4. Question devient disponible pour Daily/PvP

---

## Variables d'environnement

**Fichier** : `apps/backend/.env`

**Principales variables** :
- `DATABASE_URL` : URL PostgreSQL
- `JWT_SECRET` : Secret pour signer les tokens JWT
- `FRONTEND_URL` : URL du frontend (CORS)
- `NODE_ENV` : `development` ou `production`

---

## Commandes de développement

### Installation
```bash
pnpm install
```

### Base de données
```bash
docker compose up -d
cd apps/backend
npx prisma migrate dev
npx prisma generate
npx prisma studio  # Interface graphique DB
```

### Backend
```bash
cd apps/backend
npm run dev
```

### Frontend
```bash
cd apps/frontend
npm run dev
```

### Scripts de génération de questions
```bash
cd apps/backend
npx tsx scripts/generate/faune-questions.ts
npx tsx scripts/generate/geographie-questions.ts
# etc.
```

### Reset du Daily (développement)
```bash
cd apps/backend
npm run reset:daily
```

---

## Points d'attention critiques

### Sécurité

1. **AdminGuard non implémenté** (ADMIN)
   - Vulnérabilité critique : tous les utilisateurs peuvent modifier les questions
   - **Action** : Ajouter un champ `isAdmin` dans User et implémenter le guard

2. **Réponses exposées au frontend** (DAILY)
   - Les `acceptedAnswers` sont envoyées au client
   - Nécessaire pour le mode saisie libre, mais peut être exploité

3. **Timing manipulable** (DAILY)
   - Le temps de réponse est mesuré côté client
   - **Amélioration** : Mesurer côté serveur

4. **Pas de rate limiting** (PROXY)
   - Le proxy peut être abusé pour télécharger massivement des images
   - **Amélioration** : Ajouter un rate limiter

---

### Performance

1. **Filtrage côté client** (COLLECTION)
   - Les filtres sont appliqués côté frontend
   - **Amélioration** : Migrer vers le backend avec pagination

2. **Pas de cache Redis**
   - Toutes les requêtes vont directement en DB
   - **Amélioration** : Cache pour Daily, leaderboards, stats

3. **Images non optimisées** (PROXY)
   - Les images sont servies telles quelles
   - **Amélioration** : Compression, resize, WebP conversion

---

### Fonctionnalités manquantes

1. **Collection utilisateur** (COLLECTION)
   - Pas de système d'acquisition ou de possession
   - En cours de développement (MVP3)

2. **Phase de ban** (PVP)
   - Prévue dans le schéma mais non implémentée
   - En standby

3. **Réinitialisation de mot de passe** (AUTH)
   - Pas de flux de réinitialisation par email

4. **Saisons actives** (PVP)
   - Table `seasons` existe mais pas de système actif

---

## Contribuer

### Avant de modifier le code

1. Lire `CLAUDE.md` à la racine du projet
2. Lire la documentation du module concerné
3. Vérifier les patterns existants dans le code
4. Ne pas modifier de fichiers sans rapport avec la tâche

### Après modification

1. Lancer les tests/checks pertinents
2. Inspecter le diff final
3. Vérifier qu'aucun fichier non concerné n'a été modifié
4. Mettre à jour la documentation si une décision ou comportement documenté change

---

## Ressources additionnelles

### Documentation projet
- `ARCHITECTURE.md` : Architecture technique détaillée
- `DATABASE.md` : Schéma de base de données et principes
- `QUESTION-QUALITY-GUIDELINES.md` : Règles de qualité des questions
- `QUESTION-INVENTORY.md` : Inventaire du contenu
- `DECISIONS.md` : Décisions techniques et choix d'architecture
- `ROADMAP.md` : Roadmap et priorités

### Documentation de session
- `docs/résumés-sessions/` : Résumés de sessions de développement
- `docs/superpowers/` : Documentation Superpowers (méthodologie de développement)

---

## Conclusion

Cette documentation a pour objectif de te permettre de **comprendre comment l'application fonctionne réellement**, aussi bien côté frontend que backend, et de pouvoir intervenir toi-même dans le code.

**Parcours recommandé** :
1. Lire cette vue d'ensemble
2. Suivre l'ordre de lecture recommandé (AUTH → QUESTIONS → DAILY → PVP → ...)
3. Explorer le code correspondant en parallèle
4. Tester les fonctionnalités en développement local

**Principe fondamental** : Le repository est la source de vérité. Ne te base pas uniquement sur la documentation : vérifie toujours le code actuel.

Bon apprentissage ! 🚀
