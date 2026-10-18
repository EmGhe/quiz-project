# Module PROXY - Proxy d'images

## Rôle du module

Le module PROXY sert d'**intermédiaire** pour charger les images depuis Wikimedia Commons en contournant les restrictions CORS et en mettant en cache les images localement.

**Responsabilités** :
- Proxification des images Wikimedia/Wikipedia
- Cache local des images téléchargées
- Headers CORS appropriés
- Validation des URLs (whitelist Wikimedia uniquement)

**Pourquoi** : Les navigateurs bloquent le chargement d'images cross-origin dans certains contextes (Canvas, WebGL). Le proxy permet de servir ces images depuis le même domaine.

---

## Architecture

```
Frontend
    ↓
GET /api/proxy/image?url=https://upload.wikimedia.org/...
    ↓
ProxyController
    ├─ Validation URL (whitelist Wikimedia)
    ├─ Vérification cache local
    │   ├─ Si cached → retour direct
    │   └─ Si non cached ↓
    ├─ Téléchargement depuis Wikimedia
    ├─ Mise en cache (MD5 hash du URL)
    └─ Retour image avec headers CORS
```

---

## Backend

### Route

| Méthode | Route | Paramètres | Rôle |
|---------|-------|------------|------|
| `GET` | `/api/proxy/image` | `url` (query) | Proxifie une image Wikimedia |

**Exemple** :
```
GET /api/proxy/image?url=https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg
```

**Réponse** : Image binaire avec headers :
- `Content-Type` : Détecté depuis l'URL ou la réponse Wikimedia
- `Cache-Control` : `public, max-age=31536000` (1 an)
- `Access-Control-Allow-Origin` : `*`

---

### ProxyService

#### Cache local

**Localisation** : `apps/backend/cache/images/`

**Nommage** : MD5 hash de l'URL → `{hash}.cache`

**Exemple** :
```
URL: https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg
Hash: 5d41402abc4b2a76b9719d911017c592
Fichier: 5d41402abc4b2a76b9719d911017c592.cache
```

#### Méthode : `getImage(url)`

1. **Calcul du hash** MD5 du URL
2. **Vérification du cache** :
   - Si existe → lecture du fichier + retour
3. **Téléchargement** depuis Wikimedia :
   - Headers : User-Agent browser réaliste, Accept images, Referer Wikipedia
   - Timeout : 10 secondes
   - Max redirects : 5
4. **Sauvegarde en cache**
5. **Retour** : `{ data: Buffer, contentType: string }`

---

## Sécurité

### Validation des URLs

**Whitelist** : Uniquement les domaines Wikimedia et Wikipedia :
```typescript
if (!url.includes('wikimedia.org') && !url.includes('wikipedia.org')) {
  throw 403 Forbidden
}
```

**Protection contre** :
- SSRF (Server-Side Request Forgery) vers des URLs internes
- Proxification de sites malveillants
- Utilisation du proxy pour scraper d'autres sites

---

### Headers de sécurité

- **Cache-Control** : 1 an → réduit la charge sur Wikimedia
- **CORS** : `*` → permet l'utilisation depuis n'importe quel domaine frontend

**Point d'attention** : Pas de rate limiting côté proxy. Un attaquant pourrait abuser du cache en demandant des milliers d'images différentes.

---

## Utilisation

### Frontend

```typescript
// Au lieu de :
<img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg" />

// Utiliser :
<img src="/api/proxy/image?url=https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg" />
```

**Avantages** :
- Contourne CORS
- Cache local → chargement plus rapide
- Contrôle du cache côté serveur

---

## Dépendances

```
PROXY
 ├── Utilisé par : QUESTIONS (questions visuelles), COLLECTION (images des cartes)
 ├── Dépend de : Wikimedia Commons API
 └── Indépendant de : AUTH (pas de protection, public)
```

---

## Points clés

1. **Whitelist stricte** : Uniquement Wikimedia/Wikipedia
2. **Cache MD5** : Hash du URL pour éviter les doublons
3. **Cache permanent** : Pas de TTL, les images restent indéfiniment
4. **Headers CORS** : Permet l'utilisation cross-origin
5. **User-Agent réaliste** : Évite les blocages Wikimedia
6. **Timeout 10s** : Limite les requêtes lentes

---

## Amélioration potentielles

1. **Rate limiting** : Limiter le nombre de requêtes par IP
2. **Purge du cache** : Script de nettoyage des vieux fichiers
3. **Compression** : Optimiser les images avant de les servir
4. **CDN** : Servir les images via un CDN au lieu du backend
5. **Validation d'images** : Vérifier que c'est vraiment une image (dimensions, format)
6. **Monitoring** : Logger les URLs demandées pour détecter les abus
7. **Fallback** : Image par défaut si le téléchargement échoue
8. **Resize** : Générer plusieurs tailles (thumbnails) automatiquement
9. **WebP conversion** : Convertir en WebP pour réduire la bande passante
10. **TTL configurable** : Permettre de définir une durée de cache par type d'image
