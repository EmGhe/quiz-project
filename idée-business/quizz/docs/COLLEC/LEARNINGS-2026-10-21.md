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
