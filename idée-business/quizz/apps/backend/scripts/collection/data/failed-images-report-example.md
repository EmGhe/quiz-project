# Failed Images Report

**Date:** 2026-10-17T16:30:00.000Z
**Total failed:** 38

---

## Failed after 3 attempts: Request failed with status code 429 (21)

- **Zinedine Zidane** - `Q7251`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Alan%20Tu...
- **Johnny Hallyday** - `Q1231`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Kosovo%20...
- **Daft Punk** - `Q205012`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/60-letiya...
- **Paris** - `Q90`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/La%20Tour...
- **Notre-Dame de Paris** - `Q2981`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Notre-Dam...
- **Mont-Saint-Michel** - `Q3321850`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/NatronGel...
- **Belgique** - `Q31`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Belgique%...
- **Les Misérables** - `Q180736`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Cosette-s...
- **Le Petit Prince** - `Q25338`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Saint%20E...
- **Cyrano de Bergerac** - `Q191019`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/Cabernet%...

## No data found for QXX (12)

- **Édith Piaf** - `Q5593`
- **Molière** - `Q2105`
- **Louis XIV** - `Q12252`
- **Kylian Mbappé** - `Q1058572`
- **Emmanuel Macron** - `Q3052772`
- **Intouchables** - `Q3464665`
- **La Haine** - `Q663286`
- **Avatar** - `Q24871`
- **Assassin's Creed** - `Q200308`

## No image on Wikidata (5)

- **Marion Cotillard** - `Q106307`
- **Suisse** - `Q39`
- **Louis XIV** - `Q12252`
- **Mathieu Amalric** - `Q106544`
- **Titeuf** - `Q1245`

---

## Actions recommandées

### Pour les erreurs 429 (Rate Limiting)
- Attendre 24h puis relancer le script
- Les images seront automatiquement reprises
- Le script respecte déjà les bonnes pratiques (User-Agent, Retry-After header)

### Pour "No data found"
- Ces QIDs sont probablement générés (pas de vraies entités Wikidata)
- Vérifier dans `05-generate-50-entities.ts`
- Remplacer par de vrais QIDs Wikidata

### Pour "No image on Wikidata"
- Ajouter manuellement des images
- Ou utiliser des sources alternatives (Wikipedia, autres bases de données)
