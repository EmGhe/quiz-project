# Guide du Système Économique - Frontend

## 📦 Structure créée

### API Clients (`src/api/`)
- ✅ `gold.ts` - API Gold (balance, transactions, stats)
- ✅ `fragments.ts` - API Fragments (balance, destruction, upgrade)
- ✅ `packs.ts` - API Packs (configs, achat, ouverture, pity)

### Stores Zustand (`src/store/`)
- ✅ `goldStore.ts` - État global Gold
- ✅ `fragmentStore.ts` - État global Fragments
- ✅ `packStore.ts` - État global Packs

### Composants (`src/components/economy/`)
- ✅ `GoldBalance.tsx` - Affichage solde Gold (avec icône Coins)
- ✅ `FragmentBalance.tsx` - Affichage solde Fragments (avec icône Sparkles)
- ✅ `CurrencyDisplay.tsx` - Affichage combiné Gold + Fragments
- ✅ `PackCard.tsx` - Carte d'un pack (Bronze/Silver/Gold)
- ✅ `PackShop.tsx` - Boutique complète des packs
- ✅ `PackOpening.tsx` - Modal d'ouverture de pack avec animation
- ✅ `index.ts` - Exports centralisés

### Navigation
- ✅ `Header.tsx` - Header avec navigation + affichage monnaies
- ✅ `ShopPage.tsx` - Page boutique
- ✅ Route `/shop` ajoutée dans `App.tsx`

---

## 🎨 Utilisation des composants

### 1. Afficher les monnaies

```tsx
import { CurrencyDisplay, GoldBalance, FragmentBalance } from '@/components/economy';

// Affichage combiné
<CurrencyDisplay size="md" />

// Séparé
<GoldBalance size="lg" showIcon />
<FragmentBalance size="sm" />
```

### 2. Utiliser les stores

```tsx
import { useGoldStore } from '@/store/goldStore';
import { useFragmentStore } from '@/store/fragmentStore';
import { usePackStore } from '@/store/packStore';

function MyComponent() {
  const { balance, fetchBalance } = useGoldStore();
  const { destroyCard } = useFragmentStore();
  const { purchasePack, openPack } = usePackStore();

  useEffect(() => {
    fetchBalance();
  }, []);

  return <div>Gold: {balance}</div>;
}
```

### 3. Acheter et ouvrir un pack

```tsx
const handleBuyAndOpen = async () => {
  // Acheter
  const { packId } = await packStore.purchasePack('BRONZE');
  
  // Ouvrir
  const { cards, pityTriggered } = await packStore.openPack(packId);
  
  console.log('Cartes obtenues:', cards);
  if (pityTriggered.legendary) {
    console.log('🎉 Pity Legendary activé !');
  }
};
```

### 4. Détruire/Améliorer une carte

```tsx
const handleDestroy = async (userCardId: string) => {
  const { fragments, rarity } = await fragmentStore.destroyCard(userCardId);
  console.log(`+${fragments} fragments (carte ${rarity} détruite)`);
};

const handleUpgrade = async (userCardId: string) => {
  const { newRarity, fragmentsSpent } = await fragmentStore.upgradeCard(userCardId);
  console.log(`Carte améliorée en ${newRarity} (-${fragmentsSpent} fragments)`);
};
```

---

## 🎨 Design Tokens

### Couleurs des raretés
```tsx
const RARITY_COLORS = {
  common: 'gray',    // Gris
  rare: 'blue',      // Bleu
  epic: 'purple',    // Violet
  legendary: 'orange' // Orange/Doré
};
```

### Icônes
- 💰 Gold → `Coins` (lucide-react)
- ✨ Fragments → `Sparkles` (lucide-react)
- 📦 Pack → `Package` (lucide-react)
- 🛍️ Shop → `ShoppingBag` (lucide-react)

---

## 🔒 Informations confidentielles (backend uniquement)

**Les informations suivantes ne sont PAS affichées aux joueurs :**
- ❌ Probabilités exactes des raretés
- ❌ Compteurs pity
- ❌ Garanties minimales par pack
- ❌ Notification de pity activé

**Raison :** Préserver le mystère et l'excitation de l'ouverture de packs.

Ces mécanismes fonctionnent en backend pour garantir l'équité, mais restent cachés de l'interface utilisateur.

---

## 🔄 Workflow utilisateur

### Gagner du Gold
1. Jouer Daily Challenge → Récompense automatique selon formule
2. Streaks (5j, 10j, 20j, etc.) → Bonus automatique
3. PvP victoire/défaite → Récompense variable

### Dépenser du Gold
1. Aller sur `/shop`
2. Acheter un pack (Bronze 500G, Silver 1200G, Gold 3000G)
3. Pack créé → apparaît dans "Packs à ouvrir"

### Ouvrir un pack
1. Cliquer sur pack non ouvert
2. Animation d'ouverture (1.5s)
3. Révélation des 5 cartes (animation progressive)
4. Pity system automatique si compteur atteint
5. Cartes ajoutées à la collection

### Utiliser les Fragments
1. Détruire une carte dupliquée → Gagner fragments
2. Améliorer une carte favorite → Dépenser fragments
   - Common → Rare : 30 fragments
   - Rare → Epic : 100 fragments
   - Epic → Legendary : 300 fragments

---

## 📡 API Routes disponibles

### Gold
- `GET /gold/balance` - Solde actuel
- `GET /gold/transactions` - Historique
- `GET /gold/stats` - Statistiques complètes

### Fragments
- `GET /fragments/balance` - Solde actuel
- `GET /fragments/history` - Historique
- `GET /fragments/stats` - Statistiques
- `GET /fragments/upgrade-costs` - Coûts d'amélioration (static)
- `GET /fragments/destruction-values` - Valeurs de destruction (static)
- `DELETE /fragments/cards/:userCardId` - Détruire carte
- `POST /fragments/cards/:userCardId/upgrade` - Améliorer carte

### Packs
- `GET /packs/configs` - Configs des 3 types de packs
- `GET /packs/my-packs?opened=false` - Mes packs non ouverts
- `GET /packs/pity/:packType` - Compteur pity
- `POST /packs/purchase/:packType` - Acheter pack
- `POST /packs/open/:packId` - Ouvrir pack

---

## 🧪 Tester le système

### 1. Backend
```bash
cd apps/backend
npm run dev
```

### 2. Frontend
```bash
cd apps/frontend
npm run dev
```

### 3. Créer un utilisateur de test
- Aller sur `/register`
- Créer compte test

### 4. Donner du Gold (via Prisma Studio ou script)
```bash
cd apps/backend
npx prisma studio
# → Éditer users → Ajouter 5000 Gold
```

### 5. Tester le workflow
1. `/shop` → Acheter packs
2. Ouvrir les packs → Voir animation
3. `/collec` → Voir cartes obtenues (quand intégré)

---

## ✅ Prochaines étapes

### Intégrations à faire
- [ ] Ajouter `<Header />` dans toutes les pages
- [ ] Afficher Gold gagné après Daily submission
- [ ] Page Collection : boutons Destroy/Upgrade
- [ ] Notifications toast pour achats/ouvertures
- [ ] Historique transactions (page dédiée)
- [ ] Stats économie (page profil)

### Améliorations UI
- [ ] Animations de transition Gold/Fragments
- [ ] Confettis lors de Legendary pull
- [ ] Son d'ouverture de pack
- [ ] Preview 3D des cartes
- [ ] Filtres/tri dans boutique

---

## 🎨 Customisation

### Thème des packs
Modifier `PACK_COLORS` dans `PackCard.tsx` :
```tsx
const PACK_COLORS = {
  BRONZE: {
    gradient: 'from-amber-700 to-amber-900',
    border: 'border-amber-600',
    // ...
  },
  // ...
};
```

### Animations
Modifier durées dans `PackOpening.tsx` :
```tsx
await new Promise((resolve) => setTimeout(resolve, 1500)); // Opening
await new Promise((resolve) => setTimeout(resolve, 400));  // Per card
```

---

## 🐛 Troubleshooting

### "Cannot find module '@/components/economy'"
→ Vérifier tsconfig paths, ou utiliser import relatif

### "Failed to fetch pack configs"
→ Backend pas démarré, ou seed PackConfigs pas exécuté

### "Insufficient gold"
→ Ajouter Gold via Prisma Studio ou Daily completion

### Pack ne s'ouvre pas
→ Vérifier qu'il y a des cartes en DB (entities + cards)

---

## 📚 Documentation liée

- Backend : `/apps/backend/docs/GOLD/README.md`
- Roadmap : `/docs/ROADMAP.md`
- Pity system : Valeurs dans seed-pack-configs.ts
