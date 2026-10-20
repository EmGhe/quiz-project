# Corrections des QIDs pour les 50 entités

## ✅ QIDs Corrects (à garder) - 15/50

- Q296: Claude Monet
- Q7226: Jeanne d'Arc
- Q39931: Auguste Renoir
- Q35548: Paul Cézanne
- Q180736: Les Misérables
- Q25338: Le Petit Prince
- Q744536: Les Aventures de Tintin
- Q142: France
- Q90: Paris
- Q31: Belgique
- Q39: Suisse
- Q16: Canada
- Q70: Berne
- Q239: Bruxelles
- Q1930: Ottawa

## 🔧 QIDs à Corriger - 15/50

| Entité | Ancien QID | Nouveau QID |
|--------|------------|-------------|
| Napoléon Bonaparte | Q517 | Q517 (même, mais label légèrement différent) |
| Édith Piaf | Q5593 | Q1631 |
| Victor Hugo | Q7374 | Q1459231 |
| Molière | Q2105 | Q687 |
| Charles de Gaulle | Q2275 | Q2042 |
| Zinedine Zidane | Q7251 | Q1835 |
| Johnny Hallyday | Q1231 | Q212015 |
| Daft Punk | Q205012 | Q185828 |
| Alain Delon | Q106221 | Q106529 |
| Drapeau de la France | Q1929607 | Q43192 |
| Drapeau de l'Union européenne | Q160150 | Q98055852 |
| Drapeau du Québec | Q653071 | Q392167 |
| Assassin's Creed | Q200308 | Q200864 |
| Cyrano de Bergerac | Q191019 | Q213614 |
| Rayman | Q188593 | Q13219467 |

## ❌ QIDs à Trouver Manuellement (rate-limited) - 20/50

### Personnalités
- Louis XIV (Q12252 incorrect)
- Marion Cotillard (Q106307 incorrect)
- Gérard Depardieu (Q106544 incorrect)
- Karim Benzema (Q29465 incorrect)
- Kylian Mbappé (Q1058572 incorrect)
- Michel Platini (Q42937 incorrect)
- Vercingétorix (Q151803 incorrect)

### Culture
- La Joconde (Q12544 incorrect)
- Intouchables (Q3464665 incorrect)
- Le Fabuleux Destin d'Amélie Poulain (Q165325 incorrect)
- La Haine (Q663286 incorrect)
- Astérix (Q127117 incorrect)
- L'Étranger (Q178713 incorrect)
- Impression, soleil levant (Q212616 incorrect)
- Le Déjeuner sur l'herbe (Q1892745 incorrect)
- Lucky Luke (Q1154945 incorrect)

### Lieux
- Tour Eiffel (Q243 incorrect - label "tour Eiffel" vs "Tour Eiffel")
- Arc de Triomphe (Q274814 incorrect)
- Notre-Dame de Paris (Q2981 incorrect - label "cathédrale Notre-Dame de Paris")
- Mont-Saint-Michel (Q3321850 incorrect)

## 📝 Notes

- Le problème principal : QIDs choisis arbitrairement sans vérification
- Beaucoup de QIDs rate-limited par l'API Wikidata (limite de requêtes)
- Certains QIDs sont "techniquement corrects" mais avec des labels légèrement différents
  - Q243 → "tour Eiffel" (minuscule) au lieu de "Tour Eiffel"
  - Q2981 → "cathédrale Notre-Dame de Paris" au lieu de "Notre-Dame de Paris"

## 🎯 Prochaine Étape

Trouver manuellement les 20 QIDs manquants via:
1. https://www.wikidata.org/
2. Recherche manuelle pour chaque entité
3. Mise à jour du script 05-generate-50-entities.ts
