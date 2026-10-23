# Module COLLECTION - Système de cartes

## Rôle du module

Le module COLLECTION gère un système de **cartes à collectionner** basé sur des entités Wikidata (personnalités, lieux, œuvres, etc.). Chaque carte a une **rareté** calculée selon sa popularité et la profondeur de son contenu Wikipedia.

**Responsabilités** :
- Gestion de la collection personnelle de l'utilisateur
- Système de possession de cartes (UserCard)
- Organisation par étiquettes personnalisées (tags)
- Favoris et filtrage avancé
- Calcul de rareté (basé sur pageviews et longueur Wikipedia)
- Statistiques de collection personnelle
- Organisation par albums thématiques

**État** : MVP3 Phase 2 complet. Collection personnelle, tags, favoris implémentés. Système d'acquisition (packs, achats) en cours.

---

## Architecture

```
Scripts (génération)
    ↓
Wikidata → Entity → Card → Album
    ↓
Backend API (JWT Protected)
    ├─ CardsController
    │   ├─ GET /api/cards (collection personnelle)
    │   ├─ GET /api/cards/stats (stats personnelles)
    │   ├─ GET /api/cards/:id
    │   └─ PATCH /api/cards/:cardId/favorite
    ├─ TagsController
    │   ├─ GET /api/tags (tags utilisateur)
    │   ├─ POST /api/tags (créer tag)
    │   ├─ PATCH /api/tags/:id (modifier tag)
    │   ├─ DELETE /api/tags/:id (supprimer tag)
    │   ├─ POST /api/tags/:tagId/cards/:cardId
    │   ├─ DELETE /api/tags/:tagId/cards/:cardId
    │   └─ GET /api/tags/cards/:cardId
    └─ RarityService (calcul)
    ↓
Frontend (Zustand stores)
    ├─ CollectionPage
    │   ├─ TagFilter
    │   ├─ CardGrid (cartes possédées)
    │   └─ CardDetailModal (tags + favoris)
    └─ tagStore (gestion tags)
```

---

## Base de données

### Table : `entities`

Entités Wikidata (source de vérité).

```prisma
model Entity {
  id              String
  wikidataId      String @unique
  label           String
  type            String
  pageviewsMonth  Int
  wikiTextLength  Int
  rarityScore     Float
  description     String
  wikidataUrl     String
  wikipediaUrl    String?
  
  card            Card?
}
```

### Table : `cards`

Cartes dérivées des entités.

```prisma
model Card {
  id          String
  entityId    String @unique
  rarity      String  // common, uncommon, rare, epic, legendary
  imageUrl    String
  imageWidth  Int
  imageHeight Int
  displayOrder Int?
  active       Boolean @default(true)
  
  entity      Entity
  albums      CardAlbum[]
}
```

### Table : `albums`

Albums thématiques regroupant les cartes.

```prisma
model Album {
  id          String
  slug        String @unique
  name        String
  description String?
  icon        String?
  displayOrder Int
  
  cards       CardAlbum[]
}
```

### Table : `card_albums`

Liaison many-to-many entre cartes et albums.

```prisma
model CardAlbum {
  id       String
  cardId   String
  albumId  String
  
  card     Card
  album    Album
  
  @@unique([cardId, albumId])
}
```

### Table : `user_cards`

Cartes possédées par les utilisateurs (collection personnelle).

```prisma
model UserCard {
  id         String
  userId     String
  cardId     String
  isFavorite Boolean @default(false)
  obtainedAt DateTime @default(now())
  
  user       User
  card       Card
  
  @@unique([userId, cardId])
}
```

### Table : `tags`

Étiquettes personnalisées créées par les utilisateurs.

```prisma
model Tag {
  id        String
  userId    String
  label     String
  color     String
  createdAt DateTime @default(now())
  
  user      User
  cardTags  CardTag[]
  
  @@unique([userId, label])
}
```

### Table : `card_tags`

Association entre cartes et étiquettes (scoped par utilisateur).

```prisma
model CardTag {
  id        String
  userId    String
  cardId    String
  tagId     String
  createdAt DateTime @default(now())
  
  user      User
  card      Card
  tag       Tag
  
  @@unique([userId, cardId, tagId])
}
```

---

## Backend

### Routes

**CardsController** (JWT requis)

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/cards` | Collection personnelle (filtrable) |
| `GET` | `/api/cards/stats` | Statistiques personnelles |
| `GET` | `/api/cards/:id` | Détail d'une carte possédée |
| `PATCH` | `/api/cards/:cardId/favorite` | Toggle favori |

**TagsController** (JWT requis)

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/tags` | Tags de l'utilisateur |
| `POST` | `/api/tags` | Créer un tag |
| `PATCH` | `/api/tags/:id` | Modifier un tag |
| `DELETE` | `/api/tags/:id` | Supprimer un tag |
| `POST` | `/api/tags/:tagId/cards/:cardId` | Ajouter tag à carte |
| `DELETE` | `/api/tags/:tagId/cards/:cardId` | Retirer tag de carte |
| `GET` | `/api/tags/cards/:cardId` | Tags d'une carte |

**AlbumsController**

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/albums` | Liste des albums |
| `GET` | `/api/albums/:slug` | Détail d'un album |

### CardsService

#### `findAll(userId, filters)`

**Important :** Requête sur `UserCard`, pas `Card` → affiche uniquement les cartes possédées.

Filtres supportés :
- `albumId` : cartes d'un album spécifique
- `rarity` : common, uncommon, rare, epic, legendary
- `search` : recherche dans `entity.label` (insensible à la casse)
- `tagId` : cartes avec un tag spécifique (requête 2 étapes via CardTag)
- `isFavorite` : filtrer les favoris

**Tri** : `displayOrder ASC`, puis `createdAt DESC`

**Inclusions** : `card.entity`, `card.albums`

**Filtrage par tag :** Utilise une requête en 2 étapes (limitation Prisma sur relations imbriquées) :
1. Récupérer les `cardId` via `CardTag.findMany({ where: { tagId, userId } })`
2. Filtrer `UserCard` avec `card: { id: { in: cardIds } }`

#### `getStats(userId)`

Retourne les statistiques de la collection personnelle :
- `total` : nombre de cartes possédées
- `byRarity` : comptage par rareté (cartes possédées uniquement)
- `byAlbum` : comptage par album (cartes possédées uniquement)

---

### RarityService

**Rôle** : Calcule la rareté d'une carte basée sur les métriques Wikipedia/Wikidata.

#### Calcul de rareté

**Formule** :
```
rarityScore = 0.4 × pageviewsScore + 0.6 × wikiLengthScore
```

**pageviewsScore** (échelle logarithmique) :
```
score = 25 × log10(pageviews / 100)
```
- 100 vues → 0
- 1 000 vues → ~25
- 10 000 vues → ~50
- 100 000 vues → ~75
- 1 000 000 vues → ~100

**wikiLengthScore** (échelle linéaire à rendements décroissants) :
- 0-1k caractères → 0-20
- 1k-5k → 20-40
- 5k-20k → 40-60
- 20k-50k → 60-90
- 50k+ → 90-100

#### Tiers de rareté

| Score | Tier |
|-------|------|
| 90-100 | legendary |
| 70-89 | epic |
| 50-69 | rare |
| 30-49 | uncommon |
| 0-29 | common |

**Principe** : Les entités **populaires** ET **bien documentées** sont rares. Une entité très populaire mais peu documentée sera moins rare qu'une entité moyennement populaire mais très documentée.

---

## Frontend

### CollectionPage

**Composants** :
- `CollectionStats` : Statistiques personnelles
- `TagFilter` : Filtrage par étiquettes
- `AlbumFilter` : Filtrage par album
- `RarityFilter` : Filtrage par rareté
- `SearchInput` : Recherche par nom
- `CardGrid` : Grille de cartes possédées
- `CardDetailModal` : Modal avec tags + favoris
- `CardComponent` : Affichage carte avec étoile favori + tags
- `TagManager` : Gestionnaire de tags (création, ajout, suppression)
- `TagBadge` : Badge tag coloré
- `FavoriteIcon` : Icône étoile (☆/⭐)

**Stores Zustand** :
- `useCollectionStore` : Cartes, albums, stats
  - `fetchAll()` : Charge collection personnelle
  - `setFilter()` : Applique filtres côté client
- `useTagStore` : Tags et associations
  - `tags: Tag[]` : Tags de l'utilisateur
  - `cardTags: Record<cardId, Tag[]>` : Tags par carte
  - CRUD actions avec error handling
  - Limite 4 tags par carte

**Filtrage** : Hybride (tag via API, autres côté client).

---

## Scripts de génération

**Localisation** : `apps/backend/scripts/collection/`

**Processus** :
1. Récupération des entités depuis Wikidata
2. Récupération des métriques (pageviews, longueur Wikipedia)
3. Calcul du `rarityScore` via `RarityService`
4. Détermination du tier de rareté
5. Téléchargement de l'image représentative
6. Création `Entity` + `Card`
7. Association aux `Album` appropriés

**Problèmes connus** (cf. `IMAGES-ISSUES-REPORT.md`) :
- Téléchargement d'images parfois défaillant
- URLs Wikimedia Commons complexes
- Validation d'images manquante

---

## Dépendances

```
COLLECTION
 ├── Utilise : AUTH (JWT requis sur tous les endpoints collection/tags)
 ├── Source : Wikidata, Wikipedia
 └── Lié à : QUESTIONS (potentiellement, via entités communes)
```

**Authentification** :
- Tous les endpoints `/api/cards` et `/api/tags` nécessitent JWT
- `@UseGuards(JwtAuthGuard)` au niveau controller
- `@CurrentUser()` decorator pour récupérer userId
- Frontend : `apiClient` configuré avec `withCredentials: true`

---

## Points clés

1. **Collection personnelle** : Chaque utilisateur a sa propre collection (UserCard), pas d'affichage de cartes non possédées

2. **Système de tags** : Étiquettes personnalisées colorées, max 4 par carte, 12 couleurs preset

3. **Favoris** : Toggle étoile sur chaque carte, filtre favoris

4. **Rareté basée sur métriques objectives** : Popularité (pageviews) + Profondeur (longueur wiki)

5. **Pondération 40/60** : Favorise les entités bien documentées sur les simples célébrités

6. **Albums thématiques** : Une carte peut appartenir à plusieurs albums

7. **Images depuis Wikimedia Commons** : Téléchargées et servies localement

8. **Authentification obligatoire** : JWT requis pour accéder à la collection et aux tags

---

## Améliorations potentielles

### ✅ Implémenté (MVP3 Phase 2)
- ✅ Collection par utilisateur (UserCard)
- ✅ Authentification (JWT sur toutes les routes)
- ✅ Tags personnalisés (création, ajout, suppression)
- ✅ Système de favoris
- ✅ Filtrage par tags
- ✅ Statistiques personnelles

### 🚧 En cours / Priorité haute
1. **Système d'acquisition** : Packs → UserCard integration, gestion doublons
2. **Collection milestones** : Rewards à 25%, 50%, 75%, 100% completion
3. **Rarity sets** : Compléter toutes les Common/Rare → rewards

### 🔮 Futur
4. **Filtrage côté serveur** : Pagination et tous filtres en DB
5. **Validation d'images** : Vérifier dimensions, format, poids
6. **Cache** : Métriques Wikidata/Wikipedia (éviter requêtes répétées)
7. **Albums dynamiques** : Génération automatique basée sur catégories Wikidata
8. **Recherche avancée** : Par type d'entité, période, nationalité, etc.
9. **Achievements & badges** : Titres personnalisés, badges collection complète
10. **Trading** : Échange de cartes entre joueurs

---

## Documentation détaillée

- **Tags System :** Voir `TAGS-SYSTEM-2026-10-24.md` pour l'architecture complète du système de tags
- **Learnings :** Voir `LEARNINGS-2026-10-21.md` pour les problèmes résolus lors de l'intégration Wikidata
- **Scripts :** Voir `script-feedbacks.md` pour les règles métier de calcul de rareté
