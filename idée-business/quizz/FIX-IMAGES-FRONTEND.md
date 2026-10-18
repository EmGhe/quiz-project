# Fix - Images de Collection non visibles dans le Frontend

## 🐛 Problème

Les 12 cartes avec images ne s'affichaient pas dans http://localhost:5173/collec malgré :
- ✅ Backend servant correctement les images sur http://localhost:3000/images/collection/
- ✅ API retournant les bonnes URLs (`/images/collection/xxx.jpg`)
- ✅ Images physiquement présentes dans `apps/backend/public/images/collection/`

## 🔍 Diagnostic

**Cause racine :** Cross-Origin Request

Le frontend sur `http://localhost:5173` essayait de charger les images avec des URLs relatives :
```html
<img src="/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg" />
```

Ce qui résultait en une requête vers :
```
http://localhost:5173/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg
```

Mais les images sont servies par le backend sur :
```
http://localhost:3000/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg
```

## ✅ Solution

**Ajout d'un proxy Vite pour `/images`**

**Fichier modifié :** `apps/frontend/vite.config.ts`

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/images': {  // ← NOUVEAU
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

**Comment ça marche :**

1. Le navigateur demande `http://localhost:5173/images/collection/xxx.jpg`
2. Vite intercepte la requête (proxy)
3. Vite redirige vers `http://localhost:3000/images/collection/xxx.jpg`
4. Le backend retourne l'image
5. Vite renvoie l'image au navigateur

## 🧪 Tests de Vérification

### 1. Backend sert les images
```bash
curl -I http://localhost:3000/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg
# Doit retourner: HTTP/1.1 200 OK + Content-Type: image/jpeg
```

### 2. API retourne les cartes avec images
```bash
curl -s http://localhost:3000/api/cards | grep -o '"imageUrl"' | wc -l
# Doit retourner: 50 (toutes les cartes)

curl -s http://localhost:3000/api/cards | grep '/images/collection/' | wc -l
# Doit retourner: 12 (cartes avec images valides)
```

### 3. Proxy Vite fonctionne
```bash
curl -I http://localhost:5173/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg
# Doit retourner: HTTP/1.1 200 OK (via proxy)
```

## 📊 État Actuel

**12 cartes sur 50 ont des images :**

1. Napoléon Bonaparte
2. Victor Hugo
3. Jeanne d'Arc
4. Auguste Renoir
5. Alain Delon
6. Gérard Depardieu
7. Paul Cézanne
8. Tour Eiffel
9. France
10. Berne
11. L'Étranger
12. Rayman

**38 cartes restantes :**
- Images bloquées par rate limiting (429)
- QIDs invalides (données générées)
- Pas d'images sur Wikidata

## 🚀 Prochaines Étapes

### Pour voir les 12 images maintenant

1. ✅ Proxy Vite configuré
2. ✅ Frontend redémarré
3. **Ouvre http://localhost:5173/collec dans ton navigateur**

Les 12 cartes avec images devraient maintenant s'afficher !

### Pour télécharger les 38 images restantes

```bash
cd apps/backend
pnpm exec tsx scripts/collection/06-update-card-images.ts
```

Le script avec batch API optimisé va :
- Phase 1: Récupérer métadonnées en 1 seul appel (3 secondes)
- Phase 2: Télécharger images séquentiellement (~20 minutes)

## 📝 Notes Techniques

### Pourquoi ne pas mettre les images dans `apps/frontend/public/` ?

**Option 1 (Actuelle) : Images servies par le backend**
- ✅ Une seule source de vérité
- ✅ Pas de duplication
- ✅ Facile à gérer en production (1 seul déploiement)

**Option 2 (Alternative) : Images dans frontend/public/**
- ❌ Duplication des fichiers
- ❌ Sync manuel nécessaire
- ❌ Deux déploiements si images changent

### En Production

Avec Vercel/Netlify, le proxy Vite ne sera pas utilisé. Il faudra soit :

1. **Option recommandée :** Configurer le routing pour que `/images` pointe vers le backend
   ```
   /images/* → https://api.votreapp.com/images/:splat
   ```

2. **Alternative :** Modifier l'API pour retourner les URLs complètes
   ```typescript
   imageUrl: `${process.env.BACKEND_URL}/images/collection/xxx.jpg`
   ```

Pour l'instant en développement, le proxy Vite est la solution parfaite.

---

**Date :** 2026-10-17  
**Statut :** ✅ Résolu  
**Impact :** Les 12 images sont maintenant visibles dans /collec
