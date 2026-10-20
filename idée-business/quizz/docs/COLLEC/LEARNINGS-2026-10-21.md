# Learnings - Collection System (21 Oct 2026)

## Problèmes Critiques Résolus

### 1. Labels multilingues Wikidata
**Problème :** Victor Hugo (Q535) et Kylian Mbappé (Q21621995) n'ont que des labels `mul` (multilingue), pas `fr`  
**Erreur :** `No data found for {QID}` avec `FILTER(LANG(?label) = "fr")`  
**Solution :** Accepter `fr/mul/en` avec ORDER BY pour priorité
```sparql
FILTER(LANG(?label) = "fr" || LANG(?label) = "mul" || LANG(?label) = "en")
ORDER BY IF(LANG(?label) = "fr", 1, IF(LANG(?label) = "mul", 2, 3))
```

### 2. Champs obligatoires vs optionnels
**Problème :** Requête SPARQL exigeait description ET type en français  
**Impact :** Échecs sur entités valides (drapeaux, logos, symboles)  
**Solution :** 
- Rendre `description` et `type` OPTIONAL
- Ajouter valeurs par défaut : `'' | 'entité'`
- Éviter undefined dans le code

### 3. Entités sans Wikipedia
**Problème :** Drapeau UE (Q98055852) n'a pas d'article Wikipedia français  
**Impact :** `pageviews=null` → impossible de calculer rarity  
**Solution :** Fallback rarity 'common' (score 25.0) pour symboles/drapeaux

### 4. Bug User-Agent
**Problème :** `this.USER_AGENT` dans classe statique → undefined → 403 Forbidden  
**Fix :** `USER_AGENT` (constante hors classe)

## Patterns Anti-Rate-Limiting

### Approche "Verify Once, Use Forever"
- ✅ Vérifier QIDs manuellement 1 fois → JSON
- ✅ Réutiliser indéfiniment (0 requête de recherche)
- ✅ Réduction 90% des requêtes API (250 → ~100)

### Délais stratégiques
```typescript
1.5s  // Entre Wikidata et Wikipedia (même entité)
3s    // Entre entités (génération)
25-35s // Entre téléchargements d'images
```

### Batch fetching
- Grouper 50 entités en 1 requête SPARQL (VALUES clause)
- Phase 1: metadata batch → cache
- Phase 2: downloads séquentiels avec délais

## Validation Images

### Seuil actuel : 35/100
**Trop strict :**
- Drapeaux SVG rejetés (15/100 : "1/2 words match")
- Monuments avec noms longs (20/100 : "2/3 words match")
- Photos d'expositions (0/100)

**Bien rejeté :**
- Maps/cartes (pattern: `map`, `location`)
- Vues aériennes génériques
- Photos hors-sujet (murals, exhibits)

### Patterns à retenir
```typescript
// Bonus pour portraits peints (artistes OK)
if (filename.includes('david') || filename.includes('rembrandt')) score += 15

// Pénalité pour patterns suspects
['map', 'location', 'aerial', 'luftaufnahme'] → -40 score

// Match label dans filename : +50
```

## QIDs Problématiques Corrigés

| QID Incorrect | Entité Retournée | QID Correct | Raison |
|--------------|------------------|-------------|---------|
| Q3721206 | Vollenhovia samoensis (fourmi) | Q21621995 | Mbappé inventé |
| Q7374 | Alfred Hitchcock | Q535 | Victor Hugo inventé |
| Q167726 | Astérix (série) | Q7620503 | Voulait personnage, pas œuvre |
| Q23691 | Lucky Luke (série) | Q10870658 | Voulait personnage, pas œuvre |
| Q178713 | Alien (film) | Q163297 | L'Étranger (Camus) homophone |
| Q106510 | Acteur incorrect | Q106508 | Gérard Depardieu typo |
| Q42813 | Casalmorano (ville) | Q98055852 | Drapeau UE inventé |

**Leçon :** JAMAIS inventer de QID. Toujours vérifier sur wikidata.org

## Stratégie Disambiguation

### Homonymes
Choisir par `statements + sitelinks` (score combiné = mieux documenté)  
Exemple : La Joconde → 153 statements + 146 sitelinks

### Personnage vs Œuvre
Si nom seul donné → chercher "personnage" dans description  
```typescript
if (description.includes('personnage') || description.includes('character'))
```

### Ordre de priorité
1. Vérification manuelle (source de vérité)
2. Statements + sitelinks (quantité documentation)
3. Type detection (personnage > œuvre)

## Résultats Finaux

```
Entités    : 49/49 (100%) - 3 fixées (Q535, Q21621995, Q98055852)
Images     : 32/49 (65%)  - 17 sans image Wikidata ou rejetées
Temps total: ~25 min (génération + download avec rate limiting)
Commits    : 3 (fix SPARQL, images, cleanup)
```

## À Retenir

### ✅ Faire
- Vérifier QIDs manuellement avant génération
- Tester requêtes SPARQL avec/sans language filters
- Utiliser OPTIONAL pour champs non-critiques
- Fallback pour cas edge (symboles sans Wikipedia)
- Rate limiting généreux (mieux lent que bloqué)

### ❌ Éviter
- Inventer des QIDs sans vérification
- Requêtes SPARQL trop strictes (all fields required)
- `this.` dans classes statiques
- Batch trop gros (>50 entités)
- Sleep < 1s entre requêtes API

## Améliorations Futures

**Coverage images (65% → 80%+) :**
- Baisser seuil validation 35 → 25 pour drapeaux/monuments
- Upload manuel pour 17 manquantes (films, jeux vidéo)
- Fallback sur images English Wikipedia

**Performance :**
- Cache HTTP pour metadata (éviter re-fetch)
- Paralléliser downloads avec pool limité (3-5 concurrent)
- Pre-warm cache lors setup initial

**Qualité :**
- Validation humaine finale des images
- A/B test seuils validation
- Metrics: temps chargement, taux engagement par rarity

---

## Next Steps : 100% Image Coverage

**Objectif :** 17 entités manquantes → solutions par catégorie

### Stratégie 1 : Ajuster Validation (Quick Win - 6 entités)

**Baisser seuil 35 → 25 pour types spécifiques :**

```typescript
// Dans validateImageUrl()
const threshold = (entityType.includes('drapeau') || entityType.includes('monument'))
  ? 25  // Plus permissif pour symboles/architecture
  : 35; // Standard pour personnes/objets
```

**Impact estimé :**
- ✅ Drapeau France (15/100) → accepté
- ✅ Drapeau Québec (15/100) → accepté
- ✅ Notre-Dame (20/100) → accepté
- ✅ Mont-Saint-Michel (0/100) → chercher autre image Wikidata
- ✅ Arc de Triomphe (20/100) → déjà téléchargé
- ✅ Drapeau UE (0/100) → chercher SVG direct

**Commande :** Re-run `06-update-card-images.ts` après ajustement

### Stratégie 2 : Sources Alternatives (Medium - 6 entités)

**Wikipedia EN fallback pour entités sans P18 :**

| Entité | QID | Action |
|--------|-----|--------|
| Karim Benzema | Q1912 | Wikipedia EN a P18, fetch avec lang=en |
| Le Petit Prince | Q25338 | Chercher P18 éditions livre (pas expo) |
| Tintin | Q744536 | Chercher P154 (logo) au lieu de P18 |
| Assassin's Creed | Q200864 | Utiliser P154 (logo) ou cover art |
| Rayman | Q13219467 | Utiliser P154 (logo) ou character sprite |
| Intouchables | Q595 | Poster officiel (P18 existe, valider manuellement) |

**Script à créer :**
```typescript
// scripts/collection/07-fetch-alternative-images.ts
// 1. Try English Wikipedia P18
// 2. Try P154 (logo) for games/series
// 3. Try P491 (cover art) for movies/books
```

### Stratégie 3 : Upload Manuel (Last Resort - 5 entités)

**Films/Pays sans images automatisables :**

| Entité | Solution |
|--------|----------|
| Amélie Poulain (Q484048) | Upload poster officiel Wikimedia Commons |
| La Haine (Q466101) | Upload poster officiel |
| France (Q142) | Utiliser drapeau ou carte simplifiée custom |
| Suisse (Q39) | Utiliser drapeau |
| Canada (Q16) | Utiliser drapeau |
| Bruxelles (Q239) | Photo Grand-Place (chercher manuellement) |

**Process :**
1. Télécharger images libres de droits (Unsplash, Pexels)
2. Upload sur Wikimedia Commons avec license
3. Ajouter P18 sur Wikidata
4. Attendre 24h
5. Re-fetch avec script

**Ou plus rapide :** Upload direct dans `/public/images/collection/` et update DB

```sql
UPDATE cards SET 
  image_url = '/images/collection/custom/{hash}.jpg',
  image_width = 800, 
  image_height = 600
WHERE entity_id IN (SELECT id FROM entities WHERE wikidata_id = 'Q595');
```

### Roadmap Réaliste

**Phase 1 (30 min) - Validation ajustée :**
- [ ] Modifier seuil drapeaux/monuments → +6 images
- [ ] Re-run download script
- [ ] **Résultat :** 38/49 (78%)

**Phase 2 (2h) - Sources alternatives :**
- [ ] Script fetch EN Wikipedia P18
- [ ] Script fetch P154/P491 properties
- [ ] Validation manuelle résultats
- [ ] **Résultat :** 44/49 (90%)

**Phase 3 (3h) - Upload manuel :**
- [ ] Sourcer 5 images libres droits
- [ ] Upload Wikimedia Commons OU direct /public
- [ ] Update DB manuellement si direct
- [ ] **Résultat :** 49/49 (100%)

### Script Helper Proposé

```bash
# scripts/collection/helpers/check-alternative-sources.ts
# Affiche sources alternatives pour entités sans image

Output example:
---
Karim Benzema (Q1912)
  ✗ P18 (image): none
  ✓ EN Wikipedia P18: https://commons.../Benzema.jpg
  ⚠ Validation needed: manual review
---
```

### Décision : Effort vs Impact

| Stratégie | Effort | Gain | Total Coverage |
|-----------|--------|------|----------------|
| Ajuster validation | 30 min | +6 | 78% |
| Sources alt. | 2h | +6 | 90% |
| Upload manuel | 3h | +5 | 100% |

**Recommandation :** Phase 1 + Phase 2 (90%) = meilleur ROI  
Phase 3 uniquement si 100% critique pour UX
