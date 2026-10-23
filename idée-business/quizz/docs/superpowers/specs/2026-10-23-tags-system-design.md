# Spec : Système d'étiquettes pour cartes de collection

**Date** : 2026-10-23  
**Statut** : Approuvé pour implémentation  
**Auteur** : Claude Sonnet 4.5

---

## Vue d'ensemble

### Objectif

Permettre aux utilisateurs d'organiser leur collection de cartes avec un système d'étiquettes (tags) personnalisées et colorées. Les étiquettes sont visibles dans la grille de cartes et permettent de filtrer la collection.

### Contexte

Actuellement, la page `/collec` affiche une grille de cartes avec filtres par album, rareté et recherche textuelle. Le modal de détail d'une carte montre les informations de base (nom, rareté, image, description, lien Wikipedia) mais ne permet pas d'organisation personnelle.

### Résultat attendu

Un utilisateur peut :
1. Créer des étiquettes personnalisées avec un nom et une couleur
2. Poser jusqu'à 4 étiquettes par carte
3. Voir les étiquettes directement sur les cartes dans la grille (coin inférieur gauche)
4. Filtrer sa collection par étiquette
5. Gérer ses étiquettes (créer, modifier, supprimer, réutiliser)

---

## Principe de conception

### Architecture globale

**Modèle de données** :
```
User 1──n Tag 1──n CardTag n──1 Card
         ↓                    ↓
      (label, color)      (association)
```

**Flux utilisateur** :
1. L'utilisateur ouvre le modal d'une carte
2. Il crée une étiquette (nom + couleur) ou sélectionne une existante
3. L'étiquette est posée sur la carte
4. Elle apparaît immédiatement dans la grille et le modal
5. L'utilisateur peut filtrer sa collection par cette étiquette

### Décisions clés

| Aspect | Décision | Rationale |
|--------|----------|-----------|
| **Portée** | Étiquettes par utilisateur | Chaque joueur organise sa collection personnellement |
| **Réutilisation** | Étiquettes réutilisables | Une étiquette peut être posée sur plusieurs cartes |
| **Limite** | Maximum 4 étiquettes/carte | Évite la surcharge visuelle |
| **Affichage** | Visibles dans la grille | Organisation visible sans cliquer |
| **Filtrage** | Côté serveur | Performance pour grandes collections |
| **Couleurs** | Palette prédéfinie (12 couleurs) | Cohérence visuelle |

---

## Base de données

### Nouveaux modèles Prisma

#### Model `Tag`

Représente une étiquette créée par un utilisateur.

```prisma
model Tag {
  id        String   @id @default(uuid())
  userId    String
  label     String   // "Favoris", "À upgrader", "France"
  color     String   // Code hex: "#EF4444"
  createdAt DateTime @default(now())
  
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardTags  CardTag[]
  
  @@unique([userId, label])
  @@index([userId])
  @@map("tags")
}
```

**Contraintes** :
- `@@unique([userId, label])` : Un utilisateur ne peut pas avoir deux étiquettes avec le même nom
- `onDelete: Cascade` : Si l'utilisateur est supprimé, ses étiquettes le sont aussi

#### Model `CardTag`

Table de liaison many-to-many entre cartes et étiquettes.

```prisma
model CardTag {
  id        String   @id @default(uuid())
  userId    String
  cardId    String
  tagId     String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@unique([userId, cardId, tagId])
  @@index([userId, cardId])
  @@index([userId, tagId])
  @@map("card_tags")
}
```

**Contraintes** :
- `@@unique([userId, cardId, tagId])` : Un utilisateur ne peut pas poser deux fois la même étiquette sur une carte
- Index optimisés pour les requêtes de filtrage et d'affichage

### Modifications des modèles existants

**User** :
```prisma
model User {
  // ... champs existants
  tags      Tag[]
  cardTags  CardTag[]
}
```

**Card** :
```prisma
model Card {
  // ... champs existants
  cardTags  CardTag[]
}
```

### Migration

```sql
-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "card_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");
CREATE UNIQUE INDEX "tags_userId_label_key" ON "tags"("userId", "label");
CREATE INDEX "card_tags_userId_cardId_idx" ON "card_tags"("userId", "cardId");
CREATE INDEX "card_tags_userId_tagId_idx" ON "card_tags"("userId", "tagId");
CREATE UNIQUE INDEX "card_tags_userId_cardId_tagId_key" ON "card_tags"("userId", "cardId", "tagId");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_cardId_fkey" 
  FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_tagId_fkey" 
  FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Backend

### Nouveau module : `tags`

**Structure** :
```
apps/backend/src/modules/tags/
├── tags.module.ts
├── tags.controller.ts
├── tags.service.ts
└── dto/
    ├── create-tag.dto.ts
    ├── update-tag.dto.ts
    └── tag.dto.ts
```

### Routes API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/api/tags` | ✅ | Liste des étiquettes de l'utilisateur |
| `POST` | `/api/tags` | ✅ | Créer une étiquette |
| `PATCH` | `/api/tags/:id` | ✅ | Modifier une étiquette |
| `DELETE` | `/api/tags/:id` | ✅ | Supprimer une étiquette |
| `POST` | `/api/tags/:tagId/cards/:cardId` | ✅ | Poser une étiquette sur une carte |
| `DELETE` | `/api/tags/:tagId/cards/:cardId` | ✅ | Retirer une étiquette d'une carte |
| `GET` | `/api/cards/:cardId/tags` | ✅ | Étiquettes d'une carte |

### DTOs

#### CreateTagDto

```typescript
export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color: string;
}
```

#### UpdateTagDto

```typescript
export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
```

#### TagDto

```typescript
export class TagDto {
  id: string;
  userId: string;
  label: string;
  color: string;
  cardCount: number; // Calculé via COUNT
  createdAt: string;
}
```

### Service : TagsService

#### Méthodes principales

**`findAllByUser(userId: string): Promise<TagDto[]>`**

Récupère toutes les étiquettes d'un utilisateur avec le nombre de cartes associées.

```typescript
async findAllByUser(userId: string): Promise<TagDto[]> {
  const tags = await this.prisma.tag.findMany({
    where: { userId },
    include: {
      _count: {
        select: { cardTags: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return tags.map(tag => ({
    id: tag.id,
    userId: tag.userId,
    label: tag.label,
    color: tag.color,
    cardCount: tag._count.cardTags,
    createdAt: tag.createdAt.toISOString(),
  }));
}
```

**`create(userId: string, dto: CreateTagDto): Promise<Tag>`**

Crée une nouvelle étiquette.

```typescript
async create(userId: string, dto: CreateTagDto): Promise<Tag> {
  try {
    return await this.prisma.tag.create({
      data: {
        userId,
        label: dto.label,
        color: dto.color,
      }
    });
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      throw new ConflictException('Tu as déjà une étiquette avec ce nom');
    }
    throw error;
  }
}
```

**`update(userId: string, tagId: string, dto: UpdateTagDto): Promise<Tag>`**

Modifie une étiquette (vérification ownership).

```typescript
async update(userId: string, tagId: string, dto: UpdateTagDto): Promise<Tag> {
  const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
  
  if (!tag || tag.userId !== userId) {
    throw new NotFoundException('Étiquette introuvable');
  }

  return await this.prisma.tag.update({
    where: { id: tagId },
    data: dto,
  });
}
```

**`delete(userId: string, tagId: string): Promise<void>`**

Supprime une étiquette (cascade sur CardTag).

```typescript
async delete(userId: string, tagId: string): Promise<void> {
  const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
  
  if (!tag || tag.userId !== userId) {
    throw new NotFoundException('Étiquette introuvable');
  }

  await this.prisma.tag.delete({ where: { id: tagId } });
}
```

**`addToCard(userId: string, tagId: string, cardId: string): Promise<CardTag>`**

Pose une étiquette sur une carte.

```typescript
async addToCard(userId: string, tagId: string, cardId: string): Promise<CardTag> {
  // Vérifier ownership de l'étiquette
  const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) {
    throw new NotFoundException('Étiquette introuvable');
  }

  // Vérifier ownership de la carte
  const userCard = await this.prisma.userCard.findUnique({
    where: { userId_cardId: { userId, cardId } }
  });
  if (!userCard) {
    throw new ForbiddenException('Tu ne possèdes pas cette carte');
  }

  // Vérifier la limite de 4 étiquettes
  const currentTagCount = await this.prisma.cardTag.count({
    where: { userId, cardId }
  });
  if (currentTagCount >= 4) {
    throw new BadRequestException('Maximum 4 étiquettes par carte');
  }

  // Créer l'association
  try {
    return await this.prisma.cardTag.create({
      data: { userId, cardId, tagId }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictException('Cette étiquette est déjà posée sur cette carte');
    }
    throw error;
  }
}
```

**`removeFromCard(userId: string, tagId: string, cardId: string): Promise<void>`**

Retire une étiquette d'une carte.

```typescript
async removeFromCard(userId: string, tagId: string, cardId: string): Promise<void> {
  const cardTag = await this.prisma.cardTag.findFirst({
    where: { userId, cardId, tagId }
  });

  if (!cardTag) {
    throw new NotFoundException('Association introuvable');
  }

  await this.prisma.cardTag.delete({ where: { id: cardTag.id } });
}
```

**`findCardTags(userId: string, cardId: string): Promise<Tag[]>`**

Récupère les étiquettes d'une carte.

```typescript
async findCardTags(userId: string, cardId: string): Promise<Tag[]> {
  const cardTags = await this.prisma.cardTag.findMany({
    where: { userId, cardId },
    include: { tag: true }
  });

  return cardTags.map(ct => ct.tag);
}
```

### Modification du module `collection`

#### Ajout du filtre par étiquette

**CardsController** :
```typescript
@Get()
async findAll(
  @Query('albumId') albumId?: string,
  @Query('rarity') rarity?: string,
  @Query('search') search?: string,
  @Query('tagId') tagId?: string, // NOUVEAU
  @CurrentUser() user?: User,
) {
  return this.cardsService.findAll({
    albumId,
    rarity,
    search,
    tagId,
    userId: user?.id,
  });
}
```

**CardsService.findAll()** :
```typescript
async findAll(filters: FindCardsParams): Promise<Card[]> {
  const where: Prisma.CardWhereInput = {
    active: true,
    // ... filtres existants (albumId, rarity, search)
  };

  // NOUVEAU : Filtre par étiquette
  if (filters.tagId && filters.userId) {
    where.cardTags = {
      some: {
        tagId: filters.tagId,
        userId: filters.userId,
      }
    };
  }

  return this.prisma.card.findMany({
    where,
    include: {
      entity: true,
      albums: { include: { album: true } },
    },
    orderBy: [
      { displayOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}
```

---

## Frontend

### Nouveaux types

**`types/tag.ts`** :
```typescript
export interface Tag {
  id: string;
  userId: string;
  label: string;
  color: string;
  cardCount?: number;
  createdAt: string;
}

export interface CreateTagDto {
  label: string;
  color: string;
}

export interface UpdateTagDto {
  label?: string;
  color?: string;
}
```

### API Client

**`services/tags.api.ts`** :
```typescript
import axios from 'axios';
import { Tag, CreateTagDto, UpdateTagDto } from '../types/tag';

export const tagsApi = {
  getUserTags: () => 
    axios.get<Tag[]>('/api/tags'),
  
  createTag: (data: CreateTagDto) => 
    axios.post<Tag>('/api/tags', data),
  
  updateTag: (tagId: string, data: UpdateTagDto) => 
    axios.patch<Tag>(`/api/tags/${tagId}`, data),
  
  deleteTag: (tagId: string) => 
    axios.delete(`/api/tags/${tagId}`),
  
  addTagToCard: (tagId: string, cardId: string) => 
    axios.post(`/api/tags/${tagId}/cards/${cardId}`),
  
  removeTagFromCard: (tagId: string, cardId: string) => 
    axios.delete(`/api/tags/${tagId}/cards/${cardId}`),
  
  getCardTags: (cardId: string) => 
    axios.get<Tag[]>(`/api/cards/${cardId}/tags`),
};
```

### Store Zustand

**`stores/tagStore.ts`** :
```typescript
import { create } from 'zustand';
import { Tag } from '../types/tag';
import { tagsApi } from '../services/tags.api';

interface TagStore {
  // État
  tags: Tag[];
  cardTags: Record<string, Tag[]>;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUserTags: () => Promise<void>;
  fetchCardTags: (cardId: string) => Promise<void>;
  createTag: (label: string, color: string) => Promise<Tag>;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  addTagToCard: (tagId: string, cardId: string) => Promise<void>;
  removeTagFromCard: (tagId: string, cardId: string) => Promise<void>;
  
  // Helpers
  getCardTags: (cardId: string) => Tag[];
  canAddTagToCard: (cardId: string) => boolean;
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  cardTags: {},
  loading: false,
  error: null,

  fetchUserTags: async () => {
    set({ loading: true, error: null });
    try {
      const response = await tagsApi.getUserTags();
      set({ tags: response.data, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement des étiquettes', loading: false });
    }
  },

  fetchCardTags: async (cardId: string) => {
    try {
      const response = await tagsApi.getCardTags(cardId);
      set(state => ({
        cardTags: { ...state.cardTags, [cardId]: response.data }
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des étiquettes de la carte', error);
    }
  },

  createTag: async (label: string, color: string) => {
    const response = await tagsApi.createTag({ label, color });
    set(state => ({ tags: [...state.tags, response.data] }));
    return response.data;
  },

  updateTag: async (tagId: string, updates: Partial<Tag>) => {
    const response = await tagsApi.updateTag(tagId, updates);
    set(state => ({
      tags: state.tags.map(t => t.id === tagId ? response.data : t)
    }));
  },

  deleteTag: async (tagId: string) => {
    await tagsApi.deleteTag(tagId);
    set(state => ({
      tags: state.tags.filter(t => t.id !== tagId),
      cardTags: Object.fromEntries(
        Object.entries(state.cardTags).map(([cardId, tags]) => [
          cardId,
          tags.filter(t => t.id !== tagId)
        ])
      )
    }));
  },

  addTagToCard: async (tagId: string, cardId: string) => {
    await tagsApi.addTagToCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  removeTagFromCard: async (tagId: string, cardId: string) => {
    await tagsApi.removeTagFromCard(tagId, cardId);
    await get().fetchCardTags(cardId);
  },

  getCardTags: (cardId: string) => {
    return get().cardTags[cardId] || [];
  },

  canAddTagToCard: (cardId: string) => {
    const tags = get().getCardTags(cardId);
    return tags.length < 4;
  },
}));
```

### Modification du store de collection

**`stores/collectionStore.ts`** :
```typescript
interface CollectionStore {
  // ... état existant
  filters: {
    albumId: string | null;
    rarity: string | null;
    search: string;
    tagId: string | null; // NOUVEAU
  };
  // ... reste inchangé
}
```

### Nouveaux composants

#### TagBadge

**Props** :
```typescript
interface TagBadgeProps {
  label: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  truncate?: boolean;
}
```

**Implémentation** :
```tsx
export default function TagBadge({ 
  label, 
  color, 
  size = 'md', 
  removable = false,
  onRemove,
  truncate = false 
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 rounded-full text-white font-medium ${sizeClasses[size]} ${truncate ? 'max-w-[100px]' : ''}`}
      style={{ backgroundColor: color }}
    >
      <span className={truncate ? 'truncate' : ''}>{label}</span>
      {removable && (
        <button 
          onClick={onRemove} 
          className="hover:opacity-80 ml-1"
          aria-label="Retirer l'étiquette"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

#### ColorPicker

**Palette prédéfinie** :
```typescript
export const PRESET_COLORS = [
  '#EF4444', // Rouge
  '#F97316', // Orange
  '#F59E0B', // Ambre
  '#EAB308', // Jaune
  '#84CC16', // Lime
  '#22C55E', // Vert
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Bleu
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#A855F7', // Pourpre
];
```

**Props** :
```typescript
interface ColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}
```

**Implémentation** :
```tsx
export default function ColorPicker({ selectedColor, onSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`w-10 h-10 rounded-full transition-all ${
            selectedColor === color 
              ? 'ring-4 ring-white ring-offset-2' 
              : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Couleur ${color}`}
        />
      ))}
    </div>
  );
}
```

#### TagManager

**Props** :
```typescript
interface TagManagerProps {
  cardId: string;
  currentTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tagId: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
  onCreateAndAdd: (label: string, color: string) => Promise<void>;
}
```

**Implémentation** :
```tsx
export default function TagManager({
  cardId,
  currentTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateAndAdd,
}: TagManagerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const canAddMore = currentTags.length < 4;
  const hasNoTags = availableTags.length === 0;

  const handleCreateAndAdd = async () => {
    if (!newLabel.trim()) return;
    
    setLoading(true);
    try {
      await onCreateAndAdd(newLabel.trim(), selectedColor);
      setNewLabel('');
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (hasNoTags) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">ÉTIQUETTES</h3>
        </div>
        
        <p className="text-gray-300 text-sm">
          Tu n'as pas encore d'étiquette : crée la première ci-dessous.
        </p>

        <input
          type="text"
          placeholder="Nouvelle étiquette"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={20}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />

        <ColorPicker 
          selectedColor={selectedColor}
          onSelect={setSelectedColor}
        />

        <button
          onClick={handleCreateAndAdd}
          disabled={!newLabel.trim() || loading}
          className="w-full py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer et ajouter'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">
          ÉTIQUETTES {currentTags.length > 0 && (
            <span className="ml-2 text-sm text-gray-400">
              {currentTags.length} posée{currentTags.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <button className="text-sm text-blue-400 hover:text-blue-300">
          Gérer
        </button>
      </div>

      {/* Étiquettes posées */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentTags.map(tag => (
            <TagBadge
              key={tag.id}
              label={tag.label}
              color={tag.color}
              size="md"
              removable
              onRemove={() => onRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Limite atteinte */}
      {!canAddMore && (
        <p className="text-sm text-amber-500">
          Limite de 4 étiquettes atteinte. Retire-en une pour en ajouter une nouvelle.
        </p>
      )}

      {/* Bouton ajouter */}
      {canAddMore && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Nouvelle étiquette
        </button>
      )}

      {/* Formulaire création */}
      {canAddMore && showCreateForm && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <input
            type="text"
            placeholder="Nouvelle étiquette"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />

          <ColorPicker 
            selectedColor={selectedColor}
            onSelect={setSelectedColor}
          />

          <div className="flex gap-2">
            <button
              onClick={handleCreateAndAdd}
              disabled={!newLabel.trim() || loading}
              className="flex-1 py-2 px-4 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer et poser'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewLabel('');
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### TagFilter

**Props** :
```typescript
interface TagFilterProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
}
```

**Implémentation** :
```tsx
export default function TagFilter({ tags, selectedTagId, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          selectedTagId === null 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Toutes
      </button>
      
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.id)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedTagId === tag.id 
              ? 'ring-2 ring-blue-500 ring-offset-2' 
              : 'hover:opacity-80'
          }`}
        >
          <TagBadge label={tag.label} color={tag.color} size="sm" />
          <span className="text-sm text-gray-500">({tag.cardCount})</span>
        </button>
      ))}
    </div>
  );
}
```

### Refonte du CardDetailModal

**Structure mise à jour** :
```tsx
export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const tagStore = useTagStore();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCardTags();
  }, [card.id]);

  const loadCardTags = async () => {
    await tagStore.fetchCardTags(card.id);
    setCurrentTags(tagStore.getCardTags(card.id));
  };

  const handleAddTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.addTagToCard(tagId, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true);
    try {
      await tagStore.removeTagFromCard(tagId, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAdd = async (label: string, color: string) => {
    setLoading(true);
    try {
      const newTag = await tagStore.createTag(label, color);
      await tagStore.addTagToCard(newTag.id, card.id);
      await loadCardTags();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left Panel - Carte visuelle */}
          <div className="md:w-1/2 p-6 bg-gray-50">
            <div className="relative">
              <RarityBadge rarity={card.rarity} />
              <img
                src={card.imageUrl}
                alt={card.entity.label}
                className="w-full rounded-lg shadow-md mt-4"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>
            <h2 className="text-2xl font-bold text-center mt-4">
              {card.entity.label}
            </h2>
            <p className="text-gray-700 text-center mt-2">
              {card.entity.description}
            </p>
          </div>

          {/* Right Panel - Détails + Étiquettes */}
          <div className="md:w-1/2 p-6 space-y-6">
            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>

            {/* Nom */}
            <h2 className="text-3xl font-bold">{card.entity.label}</h2>

            {/* Rareté */}
            <div>
              <RarityBadge rarity={card.rarity} />
            </div>

            {/* Type */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600">Type de la carte</h3>
              <p className="text-gray-800">{card.entity.type}</p>
            </div>

            {/* Description */}
            <div className="border border-gray-300 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {card.entity.description}
              </p>
            </div>

            {/* Lien Wikipedia */}
            {card.entity.wikipediaUrl && (
              <a
                href={card.entity.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                🔗 Lien Wikipédia
              </a>
            )}

            {/* TagManager */}
            <TagManager
              cardId={card.id}
              currentTags={currentTags}
              availableTags={tagStore.tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateAndAdd={handleCreateAndAdd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Modification de CardItem

**Ajout des étiquettes dans la grille** :
```tsx
export default function CardItem({ card, onClick }: CardItemProps) {
  const tagStore = useTagStore();
  const cardTags = tagStore.getCardTags(card.id);

  return (
    <div 
      className="relative bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Image et contenu existant */}
      <img src={card.imageUrl} alt={card.entity.label} className="w-full h-48 object-cover" />
      
      <div className="p-4">
        <h3 className="font-semibold text-lg">{card.entity.label}</h3>
        <RarityBadge rarity={card.rarity} />
      </div>

      {/* Étiquettes - coin inférieur gauche */}
      {cardTags.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1 max-w-[90%]">
          {cardTags.slice(0, 3).map(tag => (
            <TagBadge 
              key={tag.id}
              label={tag.label}
              color={tag.color}
              size="sm"
              truncate
            />
          ))}
          {cardTags.length > 3 && (
            <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded-full font-medium">
              +{cardTags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

### Intégration dans CollectionPage

**Modifications** :
```tsx
export default function CollectionPage() {
  const collectionStore = useCollectionStore();
  const tagStore = useTagStore();
  const { loading, error, cards, albums, filters, stats, setFilter } = collectionStore;
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    // Charger les étiquettes de l'utilisateur
    tagStore.fetchUserTags();
    
    // Charger la collection
    collectionStore.fetchAll();
  }, []);

  // Charger les étiquettes des cartes visibles
  useEffect(() => {
    cards.forEach(card => {
      if (!tagStore.cardTags[card.id]) {
        tagStore.fetchCardTags(card.id);
      }
    });
  }, [cards]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Collection</h1>

        <CollectionStats stats={stats} />

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 space-y-4">
          {/* Album Filter - existant */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Albums</h3>
            <AlbumFilter
              albums={albums}
              selectedAlbumId={filters.albumId}
              onSelect={(albumId) => setFilter('albumId', albumId)}
            />
          </div>

          {/* Rarity Filter - existant */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Rareté</h3>
            <RarityFilter
              selectedRarity={filters.rarity}
              onSelect={(rarity) => setFilter('rarity', rarity)}
            />
          </div>

          {/* NOUVEAU : Tag Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Étiquettes</h3>
            <TagFilter
              tags={tagStore.tags}
              selectedTagId={filters.tagId}
              onSelect={(tagId) => setFilter('tagId', tagId)}
            />
          </div>

          {/* Search - existant */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recherche</h3>
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilter('search', search)}
              placeholder="Rechercher une carte..."
            />
          </div>
        </div>

        <CardGrid cards={cards} onCardClick={setSelectedCard} />
      </div>

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}
```

---

## Gestion des erreurs

### Validation backend

| Erreur | HTTP Status | Message |
|--------|-------------|---------|
| Label vide ou > 20 char | `400` | Validation error |
| Couleur invalide | `400` | Format couleur invalide |
| Label déjà utilisé | `409` | Tu as déjà une étiquette avec ce nom |
| Étiquette inexistante | `404` | Étiquette introuvable |
| Carte non possédée | `403` | Tu ne possèdes pas cette carte |
| Limite 4 tags atteinte | `400` | Maximum 4 étiquettes par carte |
| Tag déjà posé | `409` | Cette étiquette est déjà posée sur cette carte |
| Non authentifié | `401` | Non autorisé |

### Gestion frontend

**Toast notifications** :
```typescript
try {
  await tagStore.createTag(label, color);
  toast.success('Étiquette créée !');
} catch (error) {
  if (error.response?.status === 409) {
    toast.error('Tu as déjà une étiquette avec ce nom');
  } else if (error.response?.status === 400) {
    toast.error('Label invalide (max 20 caractères)');
  } else {
    toast.error('Erreur lors de la création');
  }
}
```

**Confirmation avant suppression** :
```typescript
const handleDeleteTag = async (tag: Tag) => {
  if (tag.cardCount > 0) {
    const confirmed = window.confirm(
      `Cette étiquette est utilisée sur ${tag.cardCount} carte(s). Confirmer la suppression ?`
    );
    if (!confirmed) return;
  }
  
  await tagStore.deleteTag(tag.id);
  toast.success('Étiquette supprimée');
};
```

---

## Tests

### Backend

**Tests unitaires (TagsService)** :
- ✅ Créer une étiquette
- ✅ Erreur si label dupliqué
- ✅ Modifier une étiquette
- ✅ Supprimer une étiquette
- ✅ Poser une étiquette sur une carte
- ✅ Vérifier ownership de la carte
- ✅ Vérifier limite de 4 étiquettes
- ✅ Retirer une étiquette d'une carte
- ✅ Récupérer les étiquettes d'une carte

**Tests e2e (TagsController)** :
- ✅ GET `/api/tags` retourne les étiquettes de l'utilisateur
- ✅ POST `/api/tags` crée une étiquette
- ✅ PATCH `/api/tags/:id` modifie une étiquette
- ✅ DELETE `/api/tags/:id` supprime une étiquette
- ✅ POST `/api/tags/:tagId/cards/:cardId` pose une étiquette
- ✅ DELETE `/api/tags/:tagId/cards/:cardId` retire une étiquette
- ✅ GET `/api/cards/:cardId/tags` récupère les étiquettes
- ✅ 401 si non authentifié

### Frontend

**Tests de composants** :
- ✅ TagBadge affiche label et couleur
- ✅ TagBadge bouton supprimer fonctionne
- ✅ ColorPicker affiche 12 couleurs
- ✅ ColorPicker sélection visuelle
- ✅ TagManager affiche UI création si aucune étiquette
- ✅ TagManager affiche liste si étiquettes existantes
- ✅ TagManager désactive ajout si limite atteinte
- ✅ TagFilter filtre correctement

---

## Plan de déploiement

### Prérequis

- Backend déployé avec authentification fonctionnelle
- Base de données PostgreSQL accessible
- Frontend build et déployé

### Étapes

1. **Migration DB**
   ```bash
   cd apps/backend
   npx prisma migrate deploy
   ```

2. **Vérification**
   ```bash
   # Vérifier que les tables sont créées
   psql -d $DATABASE_URL -c "\dt tags"
   psql -d $DATABASE_URL -c "\dt card_tags"
   ```

3. **Déploiement backend**
   ```bash
   npm run build
   pm2 restart backend
   ```

4. **Déploiement frontend**
   ```bash
   cd apps/frontend
   npm run build
   # Déployer sur serveur web
   ```

5. **Tests post-déploiement**
   - Créer une étiquette via l'UI
   - Poser une étiquette sur une carte
   - Filtrer la collection par étiquette
   - Vérifier les logs backend

### Rollback

En cas de problème :
```bash
# Rollback migration
npx prisma migrate resolve --rolled-back <migration-name>

# Restaurer version précédente backend/frontend
pm2 restart backend@previous
```

---

## Ordre d'implémentation

### Phase 1 : Backend (base solide)
1. Migration Prisma (models Tag, CardTag)
2. TagsModule, TagsService, TagsController
3. DTOs et validation
4. Tests unitaires TagsService
5. Tests e2e TagsController
6. Modification CardsService (filtre tagId)

### Phase 2 : Frontend store (couche données)
7. Types TypeScript (tag.ts)
8. API client (tags.api.ts)
9. Zustand store (tagStore.ts)
10. Modification collectionStore (filtre tagId)

### Phase 3 : Composants de base (briques UI)
11. TagBadge
12. ColorPicker
13. Tests composants

### Phase 4 : Composants métier (features)
14. TagManager
15. Refonte CardDetailModal
16. TagFilter
17. Modification CardItem (affichage étiquettes)

### Phase 5 : Intégration (tout ensemble)
18. Intégration dans CollectionPage
19. Tests e2e complets
20. Ajustements UI/UX

### Phase 6 : Polish (finitions)
21. Gestion erreurs + toasts
22. Loading states
23. Responsive design
24. Accessibilité (aria-labels, keyboard nav)
25. Documentation utilisateur

---

## Critères de succès

### Fonctionnels

- ✅ Un utilisateur peut créer une étiquette avec nom et couleur
- ✅ Un utilisateur peut poser jusqu'à 4 étiquettes par carte
- ✅ Les étiquettes sont visibles dans la grille (coin inférieur gauche)
- ✅ Un utilisateur peut filtrer sa collection par étiquette
- ✅ Un utilisateur peut modifier/supprimer une étiquette
- ✅ Les étiquettes sont réutilisables sur plusieurs cartes

### Techniques

- ✅ Contraintes DB respectées (unicité, cascades)
- ✅ Tests backend passent (unitaires + e2e)
- ✅ Tests frontend passent
- ✅ Aucune régression sur fonctionnalités existantes
- ✅ Performance : filtrage côté serveur
- ✅ Sécurité : vérification ownership

### UX

- ✅ Interface intuitive (2 états du modal clairs)
- ✅ Feedback immédiat (loading, toasts)
- ✅ Pas de crash si limite atteinte (désactivation)
- ✅ Responsive sur mobile/tablette/desktop

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Conflit de noms d'étiquettes | Faible | Contrainte unique en DB + message d'erreur clair |
| Performance avec beaucoup d'étiquettes | Moyen | Index DB + filtrage serveur + pagination future |
| UX confuse (2 états du modal) | Moyen | Wireframes validés + tests utilisateurs |
| Désynchronisation cache frontend | Faible | Recharger après chaque action |
| Migration DB échoue | Élevé | Tester migration sur DB de dev + rollback plan |

---

## Extensions futures (hors scope)

- Étiquettes prédéfinies suggérées par le système
- Recherche par étiquette (autocomplete)
- Gestion d'étiquettes dédiée (page `/tags`)
- Export de collection par étiquette
- Partage de collection filtrée par étiquette
- Statistiques par étiquette
- Synchronisation temps réel (WebSocket)
- Étiquettes hiérarchiques (tags avec sous-tags)

---

## Conclusion

Cette spec décrit un système d'étiquettes complet, robuste et extensible pour organiser la collection de cartes. L'implémentation suit l'architecture existante (NestJS + Prisma + React + Zustand) et respecte les patterns du projet.

L'ordre d'implémentation recommandé permet de construire une base solide (backend + DB) avant d'ajouter les couches supérieures (store, UI).

Les critères de succès sont clairs et mesurables. Les risques sont identifiés avec des mitigations appropriées.
