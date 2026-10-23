# Tags System - Session 2026-10-24

**Status:** ✅ Complete (100% fonctionnel)

## Vue d'ensemble

Système d'étiquettes personnalisées permettant aux utilisateurs d'organiser leur collection de cartes avec des tags colorés et un système de favoris.

---

## Fonctionnalités implémentées

### Backend

**Base de données :**
- `Tag` model - Étiquettes créées par l'utilisateur
- `CardTag` model - Association cartes ↔ tags (avec userId pour permissions)
- Migration Prisma : `20261023201645_add_tag_model`
- Foreign keys avec cascade delete
- Contraintes uniques : (userId, label), (userId, cardId, tagId)

**API Endpoints :**
- `GET /api/tags` - Récupérer les tags de l'utilisateur
- `POST /api/tags` - Créer un tag
- `PATCH /api/tags/:id` - Modifier un tag
- `DELETE /api/tags/:id` - Supprimer un tag (retire de toutes les cartes)
- `POST /api/tags/:tagId/cards/:cardId` - Ajouter tag à une carte
- `DELETE /api/tags/:tagId/cards/:cardId` - Retirer tag d'une carte
- `GET /api/tags/cards/:cardId` - Récupérer les tags d'une carte
- `PATCH /api/cards/:cardId/favorite` - Toggle favorite

**Business Logic :**
- Validation : 4 tags maximum par carte
- Prévention des doublons : même label interdit par utilisateur
- Messages d'erreur en français
- Authorization : JWT required sur tous les endpoints

### Frontend

**Composants :**
- `TagBadge` - Badge tag avec couleur, taille variable, bouton X optionnel
- `ColorPicker` - Sélecteur de 12 couleurs preset
- `TagManager` - Gestionnaire complet de tags (création, ajout, suppression)
- `TagFilter` - Filtre par tags dans la collection
- `FavoriteIcon` - Icône étoile pour favoris (☆/⭐)

**Stores Zustand :**
- `tagStore` - État global des tags
  - `tags: Tag[]` - Tags de l'utilisateur
  - `cardTags: Record<cardId, Tag[]>` - Tags par carte
  - CRUD actions + error handling
  - 4-tag limit enforcement

**Pages modifiées :**
- `CardDetailModal` - Two-panel layout, favorite star, TagManager intégré
- `CardComponent` - Favorite star (top-left), tags display (bottom-left, max 3 + counter)
- `CollectionPage` - TagFilter section, tag store initialization

### UX/UI

**Interactions :**
- Créer un tag : Couleur + label (max 20 chars)
- Ajouter à une carte : Via modal, limite 4 tags affichée
- Retirer d'une carte : Bouton × sur le tag
- Supprimer définitivement : Bouton "Gérer" → hover sur tag → × rouge → confirmation
- Filtrer par tag : Clic sur tag dans la sidebar → affiche uniquement cartes avec ce tag
- Favoris : Clic sur étoile → toggle ⭐/☆

**Affichage :**
- Tags sur carte : Max 3 visibles + "+N" si plus
- Tags tronqués si texte trop long
- Couleurs preset : 12 options (#EF4444, #F59E0B, #10B981, etc.)
- Loading states sur toutes les actions async
- Error messages en français

---

## Architecture

### Collection personnelle

**Changement majeur :** `/collec` affiche maintenant **UNIQUEMENT** les cartes possédées par l'utilisateur.

**Avant :**
```typescript
// Affichait TOUTES les cartes du système
prisma.card.findMany({ where: { active: true } })
```

**Après :**
```typescript
// Affiche UNIQUEMENT les cartes de l'utilisateur
prisma.userCard.findMany({
  where: { userId },
  include: { card: {...} }
})
```

**Impact :**
- Collection vide si l'utilisateur ne possède aucune carte
- Statistiques reflètent la collection personnelle
- Filtres (tags, rareté, recherche) s'appliquent sur cartes possédées
- Script `give-all-cards-to-user.ts` pour donner cartes à un admin

### Authentification

**Tous les endpoints collection/tags nécessitent JWT :**
- `@UseGuards(JwtAuthGuard)` au niveau controller
- `@CurrentUser()` decorator pour récupérer userId
- `apiClient` (avec `withCredentials: true`) côté frontend

---

## Scripts utiles

**Donner toutes les cartes à un utilisateur :**
```bash
cd apps/backend
npm run give-all-cards <username ou email>
```

**Nettoyer les tags de test :**
```bash
cd apps/backend
npx tsx scripts/cleanup-tags.ts
```

---

## Problèmes résolus

### 1. Routage API
- ❌ Problème : TagsController sans prefix `/api`
- ✅ Solution : `@Controller('api/tags')`

### 2. Authentication
- ❌ Problème : `tags.api.ts` utilisait `axios` directement (pas de credentials)
- ✅ Solution : Utiliser `apiClient` partout

### 3. Collection vide
- ❌ Problème : CardsController sans auth guard → userId undefined
- ✅ Solution : `@UseGuards(JwtAuthGuard)` au niveau controller

### 4. Filtre par tag (500 error)
- ❌ Problème : Impossible de filtrer `card.cardTags` dans requête `UserCard`
- ✅ Solution : Requête en 2 étapes (récupérer cardIds avec tag, puis filtrer UserCards)

### 5. Statistiques incorrectes
- ❌ Problème : `getStats()` comptait toutes les cartes du système
- ✅ Solution : Compter uniquement les UserCards de l'utilisateur

---

## Métriques de succès

**Implémentation :**
- ✅ 21/21 tâches complétées (plan SDD)
- ✅ 30 commits
- ✅ 8 fix rounds (reviews)
- ✅ 0 erreurs de compilation TypeScript
- ✅ Toutes les fonctionnalités testées manuellement

**Système :**
- ✅ Tags : Create, Read, Update, Delete
- ✅ Limite 4 tags par carte
- ✅ 12 couleurs preset
- ✅ Filtrage par tags
- ✅ Favoris fonctionnels
- ✅ Collection personnelle (user ownership)

---

## Documentation associée

- **Plan d'implémentation :** `docs/superpowers/plans/2026-10-23-tags-system.md`
- **Spec design :** `docs/superpowers/specs/2026-10-23-tags-system-design.md`
- **Ledger SDD :** `.superpowers/sdd/2026-10-23-tags-system/progress.md` (dans worktree)
- **Roadmap :** `docs/ROADMAP.md` (MVP3 Phase 2)

---

## Next Steps

**MVP3 Phase 2 - Suite :**
1. **Pack opening → UserCard integration**
   - Ouvrir pack → ajouter cartes à la collection
   - Gérer doublons (garder vs convertir en fragments)
   
2. **Collection milestones**
   - Rewards à 25%, 50%, 75%, 100% completion
   - Bonus Gold/fragments
   
3. **Rarity sets**
   - Compléter toutes les Common → reward
   - Compléter toutes les Rare → reward
   
4. **Achievements & badges**
   - Badges pour collection complète
   - Titres personnalisés

---

**Session :** 2026-10-24  
**Durée totale :** ~12h (plan → implémentation → debug → tests)  
**Résultat :** Système 100% fonctionnel, prêt pour production
