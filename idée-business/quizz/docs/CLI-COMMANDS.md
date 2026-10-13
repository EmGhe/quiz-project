# CLI Commands - Quiz Platform

Guide rapide des commandes disponibles avec les bons chemins.

---

## 🚀 Démarrage du Projet

### Base de données
```bash
# Depuis n'importe où dans le projet
docker compose up -d              # Démarrer PostgreSQL
docker compose down               # Arrêter PostgreSQL
docker compose logs -f            # Voir les logs
```

### Backend (Terminal 1)
```bash
cd apps/backend
npm run dev                       # Démarrer le serveur (http://localhost:3000)
```

### Frontend (Terminal 2)
```bash
cd apps/frontend
npm run dev                       # Démarrer l'app (http://localhost:5173)
```

---

## 🗄️ Prisma (Base de données)

```bash
cd apps/backend

npx prisma studio                 # Interface graphique DB (http://localhost:5555)
npx prisma migrate dev            # Créer une migration
npx prisma db push               # Pousser le schéma sans migration
npx prisma generate              # Regénérer le client Prisma
```

---

## 🎮 Scripts de Développement

```bash
cd apps/backend

npm run reset:daily              # Supprimer et régénérer le Daily d'aujourd'hui
```

---

## 📝 Génération de Questions

Toutes les commandes depuis `apps/backend` :

### Phase 1-2 : Géographie (Capitales)
```bash
npx tsx scripts/setup/create-geography-extended-categories.ts
npx tsx scripts/ingest/capitals.ts
npx tsx scripts/generate/questions-from-facts.ts
npx tsx scripts/generate/distractors.ts
```

### Phase 3 : Sciences
```bash
npx tsx scripts/setup/create-science-categories.ts
npx tsx scripts/ingest/planets.ts
npx tsx scripts/ingest/chemical-elements.ts
npx tsx scripts/generate/science-questions.ts
npx tsx scripts/generate/science-distractors.ts
```

### Phase 4 : Histoire
```bash
npx tsx scripts/setup/create-history-categories.ts
npx tsx scripts/ingest/historical-figures.ts
npx tsx scripts/ingest/historical-events.ts
npx tsx scripts/generate/history-questions.ts
npx tsx scripts/generate/history-distractors.ts
```

### Phase 5 : Cinéma
```bash
npx tsx scripts/setup/create-cinema-categories.ts
npx tsx scripts/ingest/cinema-manual.ts
npx tsx scripts/generate/cinema-questions.ts
npx tsx scripts/generate/cinema-distractors.ts
```

### Phase 6 : Drapeaux
```bash
npx tsx scripts/setup/create-flags-category.ts
npx tsx scripts/ingest/flags-manual.ts
npx tsx scripts/generate/flags-questions.ts
npx tsx scripts/generate/flags-distractors.ts
```

### Phase 7 : Sports
```bash
npx tsx scripts/setup/create-sports-categories.ts
npx tsx scripts/ingest/sports-manual.ts
npx tsx scripts/generate/sports-questions.ts
npx tsx scripts/generate/sports-distractors.ts
```

### Phase 8 : Musique
```bash
npx tsx scripts/setup/create-music-categories.ts
npx tsx scripts/ingest/music-manual.ts
npx tsx scripts/generate/music-questions.ts
npx tsx scripts/generate/music-distractors.ts
```

### Phase 9 : Littérature
```bash
npx tsx scripts/setup/create-literature-categories.ts
npx tsx scripts/ingest/literature-manual.ts
npx tsx scripts/generate/literature-questions.ts
npx tsx scripts/generate/literature-distractors.ts
```

### Phase 10 : Culture Internet
```bash
npx tsx scripts/setup/create-internet-categories.ts
npx tsx scripts/ingest/internet-manual.ts
npx tsx scripts/generate/internet-questions.ts
npx tsx scripts/generate/internet-distractors.ts
```

### Phase 11 : Jeux Vidéo
```bash
npx tsx scripts/setup/create-videogames-categories.ts
npx tsx scripts/ingest/videogames-manual.ts
npx tsx scripts/generate/videogames-questions.ts
npx tsx scripts/generate/videogames-distractors.ts
```

### Phase 12 : Gastronomie
```bash
npx tsx scripts/setup/create-gastronomie-categories.ts
npx tsx scripts/ingest/gastronomie-manual.ts
npx tsx scripts/generate/gastronomie-questions.ts
npx tsx scripts/generate/gastronomie-distractors.ts
```

### Phase 13 : Faune
```bash
npx tsx scripts/setup/create-faune-categories.ts
npx tsx scripts/ingest/faune-manual.ts
npx tsx scripts/generate/faune-questions.ts
npx tsx scripts/generate/faune-distractors.ts
```

### Phase 14 : Flore
```bash
npx tsx scripts/setup/create-flore-categories.ts
npx tsx scripts/ingest/flore-manual.ts
npx tsx scripts/generate/flore-questions.ts
npx tsx scripts/generate/flore-distractors.ts
```

### Phase 15 : Littérature Œuvres (QCM)
```bash
npx tsx scripts/ingest/literature-works-manual.ts
npx tsx scripts/generate/literature-works-questions.ts
```

### Phase 16 : Musique Chansons
```bash
npx tsx scripts/ingest/music-songs-manual.ts
npx tsx scripts/generate/music-songs-questions.ts
```

### Phase 17 : Films/Livres Résumés
```bash
npx tsx scripts/ingest/summaries-manual.ts
npx tsx scripts/generate/summaries-questions.ts
```

### Phase 18 : Films/Livres Auteurs
```bash
npx tsx scripts/ingest/authors-manual.ts
npx tsx scripts/generate/authors-questions.ts
```

### Phase 19 : Peinture
```bash
npx tsx scripts/setup/create-peinture-categories.ts
npx tsx scripts/ingest/peinture-manual.ts
npx tsx scripts/generate/peinture-questions.ts
```

### Phase 20 : Football Entraineurs
```bash
npx tsx scripts/ingest/football-coaches-manual.ts
npx tsx scripts/generate/football-coaches-questions.ts
```

### Phase 21 : Sigles
```bash
npx tsx scripts/setup/create-sigles-categories.ts
npx tsx scripts/ingest/sigles-manual.ts
npx tsx scripts/generate/sigles-questions.ts
```

---

## 🧹 Scripts de Maintenance

```bash
cd apps/backend

# Nettoyage
npx tsx scripts/cleanup/delete-numeric-questions.ts
npx tsx scripts/cleanup/delete-vague-history-questions.ts

# Corrections
npx tsx scripts/fixes/fix-wikimedia-urls.ts
npx tsx scripts/fixes/add-usa-variant.ts
npx tsx scripts/fixes/add-chine-variant.ts
```

---

## 📊 Statistiques

```bash
cd apps/backend

# Compter les questions publiées
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.question.count({ where: { status: 'publie' } })
  .then(count => console.log('Questions publiées:', count))
  .finally(() => prisma.\$disconnect());
"

# Compter par catégorie
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.question.groupBy({
  by: ['categoryId'],
  where: { status: 'publie' },
  _count: true
}).then(console.log)
  .finally(() => prisma.\$disconnect());
"
```

---

## 🔧 Utilitaires

```bash
cd apps/backend

# Tester la génération Daily
npx tsx scripts/test/test-daily-generation.ts

# Export QA
npx tsx scripts/qa/export-for-review.ts

# Import QA results
npx tsx scripts/qa/import-review-results.ts
```

---

## 📦 Installation initiale

Si vous clonez le projet pour la première fois :

```bash
# À la racine du projet
pnpm install                     # Installer toutes les dépendances

cd apps/backend
npx prisma generate             # Générer le client Prisma
npx prisma db push              # Créer les tables (ou npx prisma migrate dev)

# Puis démarrer Docker + Backend + Frontend (voir section "Démarrage")
```

---

## 🎯 Workflow typique

1. **Lancer l'environnement**
   ```bash
   docker compose up -d
   cd apps/backend && npm run dev    # Terminal 1
   cd apps/frontend && npm run dev   # Terminal 2
   ```

2. **Ajouter des questions**
   ```bash
   cd apps/backend
   npx tsx scripts/setup/create-xxx-categories.ts
   npx tsx scripts/ingest/xxx-manual.ts
   npx tsx scripts/generate/xxx-questions.ts
   npx tsx scripts/generate/xxx-distractors.ts
   ```

3. **Tester dans l'app**
   ```bash
   npm run reset:daily              # Régénérer le Daily
   # Ouvrir http://localhost:5173
   ```

4. **Visualiser la DB**
   ```bash
   npx prisma studio                # http://localhost:5555
   ```

---

**Dernière mise à jour :** 2026-10-13  
**Total questions :** 1,726 publiées
