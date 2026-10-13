# 📥 Téléchargement des Images du Quiz

## 📁 Fichiers

- `INSTRUCTIONS-DEMAIN.md` - **LIRE EN PREMIER** - Instructions détaillées
- `test-download-speed-safe.ts` - Trouve le délai optimal (à lancer demain)
- `download-and-store-all-images.ts` - Télécharge toutes les images
- `optimal-delay.json` - Délai optimal (créé automatiquement par le test)

## 🚀 Procédure rapide

### Demain matin :

```bash
cd apps/backend

# 1. Trouver le délai optimal (~10-15 min)
npx ts-node scripts/images/test-download-speed-safe.ts

# 2. Télécharger toutes les images (~1-3h selon le délai)
npx ts-node scripts/images/download-and-store-all-images.ts
```

## ✅ Ce qui se passe

1. **Test du délai** : Essaie 10s, 20s, 30s, 45s, 60s avec 5 min entre chaque test
2. **Sauvegarde** : Le délai optimal est sauvegardé dans `optimal-delay.json`
3. **Téléchargement** : Utilise automatiquement le délai optimal trouvé
4. **Stockage** : Images dans `apps/frontend/public/images/quiz/`
5. **Mise à jour** : URLs en base changées vers `/images/quiz/[hash].jpg`

## 📊 Résultat attendu

- ✅ 180 images stockées localement
- ✅ Aucun proxy nécessaire
- ✅ Aucun problème CORS
- ✅ Chargement instantané

## ⚠️ Notes importantes

- **Ne pas lancer aujourd'hui** - ban IP actif de Wikimedia
- **Attendre demain** pour que le compteur se réinitialise
- Le script peut être **interrompu et relancé** - il reprend où il s'est arrêté
- Les images déjà téléchargées ne sont **jamais retéléchargées**
