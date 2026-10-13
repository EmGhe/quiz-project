# 📥 Instructions pour télécharger les images demain

## ⚠️ Situation actuelle

- Wikimedia nous a temporairement ban (trop de requêtes aujourd'hui)
- 7 images déjà téléchargées et fonctionnelles
- 173 images restantes à télécharger

## 🔍 Étape 1 : Trouver le délai optimal (10-15 min)

**Demain matin, lancez :**

```bash
cd apps/backend
npx ts-node scripts/images/test-download-speed-safe.ts
```

Ce script va tester différents délais (10s, 20s, 30s, 45s, 60s) avec 5 minutes d'attente entre chaque test pour éviter le ban.

**Attendez la fin** et notez le délai recommandé.

## 📥 Étape 2 : Télécharger toutes les images

Une fois le délai optimal trouvé, lancez :

```bash
npx ts-node scripts/images/download-and-store-all-images.ts
```

### Temps estimé selon le délai :

- **10s de délai** → 30 minutes (si pas de ban)
- **20s de délai** → 1 heure
- **30s de délai** → 1h30
- **45s de délai** → 2h15
- **60s de délai** → 3 heures

### ✅ Avantages de cette solution :

1. **Gratuit** - pas besoin de service tiers
2. **Fiable** - images stockées localement
3. **Rapide ensuite** - servies directement depuis `/public/images/quiz/`
4. **Pas de dépendance** - pas de proxy, pas de CORS, pas de rate limiting après

### 📊 Suivi de progression

Le script affiche en temps réel :
- ✅ Images téléchargées
- ⏭️ Images déjà en cache
- ❌ Images échouées
- ⏳ Temps d'attente avant la prochaine

### 🔄 Reprendre si interrompu

Le script est **idempotent** :
- Saute les images déjà téléchargées
- Peut être relancé autant de fois que nécessaire
- Ne retélécharge jamais la même image

Si vous devez l'interrompre (Ctrl+C), relancez simplement la même commande.

## 🎯 Résultat final

**Après le téléchargement complet :**

- ✅ 180 images dans `apps/frontend/public/images/quiz/`
- ✅ URLs mises à jour en base → `/images/quiz/[hash].jpg`
- ✅ Aucun problème CORS
- ✅ Aucun proxy nécessaire
- ✅ Chargement instantané

## 📝 Commandes rapides

```bash
# 1. Test du délai optimal (demain matin)
cd apps/backend
npx ts-node scripts/images/test-download-speed-safe.ts

# 2. Téléchargement complet (après avoir le délai optimal)
npx ts-node scripts/images/download-and-store-all-images.ts

# 3. Vérifier les images téléchargées
ls -lh ../frontend/public/images/quiz/ | wc -l

# 4. Voir la taille totale
du -sh ../frontend/public/images/quiz/
```

## ⚠️ Important

**N'essayez pas aujourd'hui** - le ban IP est actif.
**Attendez demain** pour que Wikimedia réinitialise le compteur de requêtes.
