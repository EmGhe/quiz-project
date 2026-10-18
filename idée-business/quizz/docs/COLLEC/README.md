# Module COLLECTION - Système de cartes

## Rôle du module

Le module COLLECTION gère un système de **cartes à collectionner** basé sur des entités Wikidata (personnalités, lieux, œuvres, etc.). Chaque carte a une **rareté** calculée selon sa popularité et la profondeur de son contenu Wikipedia.

**Responsabilités** :
- Affichage des cartes disponibles
- Filtrage par album, rareté, recherche
- Calcul de rareté (basé sur pageviews et longueur Wikipedia)
- Statistiques de collection
- Organisation par albums thématiques

**État** : MVP3, système de base implémenté. Pas encore de système d'acquisition (drops, achats) ni de collection utilisateur.

---

## Architecture

```
Scripts (génération)
    ↓
Wikidata → Entity → Card → Album
    ↓
Backend API
    ├─ GET /api/cards (filtres)
    ├─ GET /api/cards/stats
    ├─ GET /api/albums
    └─ RarityService (calcul)
    ↓
Frontend
    └─ CollectionPage (affichage grille)
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

---

## Backend

### Routes

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/cards` | Liste filtrée des cartes |
| `GET` | `/api/cards/stats` | Statistiques globales |
| `GET` | `/api/cards/:id` | Détail d'une carte |
| `GET` | `/api/albums` | Liste des albums |
| `GET` | `/api/albums/:slug` | Détail d'un album |

### CardsService

#### `findAll(filters)`

Filtres supportés :
- `albumId` : cartes d'un album spécifique
- `rarity` : common, uncommon, rare, epic, legendary
- `search` : recherche dans `entity.label` (insensible à la casse)

**Tri** : `displayOrder ASC`, puis `createdAt DESC`

**Inclusions** : `entity`, `albums` avec `album`

#### `getStats()`

Retourne :
- `total` : nombre total de cartes actives
- `byRarity` : comptage par niveau de rareté
- `byAlbum` : comptage par album

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
- `CollectionStats` : Statistiques globales
- `AlbumFilter` : Filtrage par album
- `RarityFilter` : Filtrage par rareté
- `SearchInput` : Recherche par nom
- `CardGrid` : Grille de cartes
- `CardDetailModal` : Modal de détail

**Store** : `useCollectionStore` (Zustand)
- `fetchAll()` : Charge cartes + albums + stats
- `setFilter()` : Applique un filtre (côté client)

**Filtrage** : Actuellement côté client, devrait être côté serveur pour les grandes collections.

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
 ├── Utilise : AUTH (protection future, non implémenté)
 ├── Source : Wikidata, Wikipedia
 └── Lié à : QUESTIONS (potentiellement, via entités communes)
```

**Note** : Actuellement **aucune protection par authentification**. Les routes sont publiques.

---

## Points clés

1. **Rareté basée sur métriques objectives** : Popularité (pageviews) + Profondeur (longueur wiki)

2. **Pondération 40/60** : Favorise les entités bien documentées sur les simples célébrités

3. **Pas de collection utilisateur** : Le système de "possession" des cartes n'est pas implémenté (MVP3 partiel)

4. **Albums thématiques** : Une carte peut appartenir à plusieurs albums

5. **Images depuis Wikimedia Commons** : Téléchargées et servies localement

6. **Filtrage côté client** : Doit être migré côté serveur pour scaler

---

## Amélioration potentielles

1. **Collection par utilisateur** : Système de possession, obtention de cartes
2. **Authentification** : Protéger les routes
3. **Filtrage côté serveur** : Pagination et filtres en DB
4. **Système d'acquisition** : Drops après quiz, achats, échanges
5. **Validation d'images** : Vérifier dimensions, format, poids
6. **Cache** : Métriques Wikidata/Wikipedia (éviter requêtes répétées)
7. **Albums dynamiques** : Génération automatique basée sur catégories Wikidata
8. **Recherche avancée** : Par type d'entité, période, nationalité, etc.
9. **Statistiques utilisateur** : Progression, cartes manquantes
10. **Trading** : Échange de cartes entre joueurs
