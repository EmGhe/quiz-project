# JEU DE CULTURE GÉNÉRALE — GAME DESIGN DOCUMENT

Version figée — Document de référence du projet

---

# 1. VISION DU JEU

Créer un jeu de culture générale compétitif, social et addictif, dont le cœur repose sur :

- la connaissance ;
- la rapidité ;
- la compétition ;
- la progression via le classement ;
- la collection ;
- les amis ;
- la fidélité quotidienne ;
- le plaisir d'apprendre.

Le jeu ne doit pas être perçu comme un simple site de quiz.

Il doit progressivement ressembler à un véritable jeu avec :

- Daily ;
- classement ;
- ELO ;
- saisons ;
- PvP ;
- streak ;
- missions ;
- collection de cartes ;
- albums ;
- économie en Gold ;
- personnalisation ;
- amis ;
- ligues privées ;
- événements spéciaux ;
- achievements ;
- partage social.

Principe fondamental :

> Le Daily est le cœur du jeu.

Les autres systèmes servent principalement à donner envie de revenir, progresser, collectionner et jouer avec les autres.

---

# 2. BOUCLES DE JEU PRINCIPALES

## Boucle quotidienne

1. Recevoir un rappel.
2. Faire le Daily.
3. Obtenir un score.
4. Gagner du Gold.
5. Faire progresser son streak.
6. Consulter son classement.
7. Partager son résultat.
8. Revenir le lendemain.

## Boucle compétitive

1. Jouer en PvP.
2. Gagner ou perdre de l'ELO.
3. Monter ou descendre dans les divisions.
4. Jouer pendant toute la saison.
5. Faire les matchs de placement au début d'une nouvelle saison.
6. Obtenir des récompenses de saison.

## Boucle collection

1. Jouer.
2. Gagner des packs / Gold.
3. Obtenir des cartes.
4. Compléter des albums.
5. Obtenir des cartes exclusives.
6. Échanger / vendre / acheter certaines cartes.
7. Personnaliser son profil.

## Boucle sociale

1. Ajouter des amis.
2. Comparer les statistiques.
3. Défier ses amis.
4. Faire des revanches.
5. Créer / rejoindre une ligue privée.
6. Partager ses performances.

---

# 3. DAILY

Le Daily est le mode principal du jeu.

## Règles

- 1 Daily par jour.
- 10 questions.
- Les mêmes 10 questions pour tous les joueurs.
- Réponses écrites dans une barre de texte.
- PAS de QCM.
- 25 secondes maximum par question.
- Une réponse correcte rapporte des points.
- Plus la réponse est rapide, plus elle rapporte de points.
- Une série de bonnes réponses augmente le multiplicateur.
- Le score final détermine le classement quotidien.

## Objectif

Mesurer :

- la connaissance ;
- la rapidité ;
- la régularité.

Le Daily doit être suffisamment court pour être fait tous les jours.

Durée cible : environ 4 à 6 minutes.

---

# 4. SCORING DU DAILY

Base :

- 100 points pour une bonne réponse.

Bonus de vitesse :

- 0–3 secondes : 100 points
- 4–7 secondes : 90 points
- 8–11 secondes : 80 points
- 12–15 secondes : 70 points
- 16–19 secondes : 60 points
- 20–22 secondes : 50 points
- 23–25 secondes : 40 points

Une mauvaise réponse rapporte 0.

## Multiplicateur de série

Exemple :

- 1 bonne réponse : x1
- 2 bonnes réponses consécutives : x1,1
- 3 : x1,2
- 4 : x1,3
- 5 : x1,5
- etc.

Le multiplicateur est réinitialisé lorsqu'une réponse est incorrecte.

Les valeurs exactes pourront être équilibrées après les premiers tests.

---

# 5. CLASSEMENT DAILY

Le classement Daily est indépendant de l'ELO.

Classement par :

1. score total ;
2. temps total de réponse comme tie-breaker.

Exemple :

Joueur A :

- 860 points
- 71 secondes

Joueur B :

- 860 points
- 76 secondes

Joueur A est devant.

Le classement peut afficher :

- position ;
- score ;
- temps ;
- percentile / top %.

---

# 6. PARTAGE DU DAILY

Le partage est une fonctionnalité importante.

Après le Daily, le joueur peut générer une carte de résultat partageable.

Elle peut contenir :

- numéro du Daily ;
- score ;
- temps ;
- streak ;
- position / percentile ;
- résultat visuel des 10 questions ;
- bouton de partage.

Objectif :

Créer un contenu facilement partageable sur :

- WhatsApp ;
- Discord ;
- réseaux sociaux ;
- messageries.

Le partage doit être suffisamment propre et intéressant pour générer de l'acquisition organique.

---

# 7. STREAK

Le streak est lié exclusivement au Daily.

Faire le Daily chaque jour fait progresser le streak.

Exemples de paliers :

- 3 jours ;
- 7 jours ;
- 10 jours ;
- 30 jours ;
- 60 jours ;
- 100 jours ;
- etc.

Les paliers peuvent donner :

- Gold ;
- packs ;
- cartes ;
- badges ;
- titres ;
- récompenses spéciales.

## Streak Freeze

Le joueur peut disposer de Streak Freeze permettant de protéger son streak lorsqu'il manque exceptionnellement un Daily.

Le système doit rester simple et compréhensible.

---

# 8. RAPPELS / NOTIFICATIONS

Le joueur peut choisir une heure de rappel quotidienne.

Exemple :

"Ton Daily t'attend."

Le rappel peut également mentionner le streak.

Exemples :

"Ton streak de 17 jours est en jeu."

"Plus que quelques heures pour préserver ton streak."

Objectif :

Reproduire une partie de l'effet de rappel quotidien de jeux comme Duolingo sans spammer l'utilisateur.

Une notification utile vaut mieux qu'une multiplication de notifications.

---

# 9. TRAINING

Le Training est distinct du Daily.

Le joueur peut choisir :

- thème ;
- difficulté ;
- nombre de questions ;
- chronométré ou non ;
- questions déjà vues ou nouvelles ;
- mode survie.

Exemples de thèmes :

- Histoire ;
- Géographie ;
- Sciences ;
- Littérature ;
- Cinéma ;
- Musique ;
- Sports ;
- Technologie ;
- Nature ;
- etc.

Après une mauvaise réponse, une courte explication peut être affichée.

## Pas de système de maîtrise

Il n'y a pas de niveau de maîtrise par catégorie dans la première version.

## Pas de quiz généré personnellement par IA

Le jeu utilise une base de questions préparées et contrôlées.

---

# 10. GOLD

Le Gold est la monnaie virtuelle principale.

## Sources de Gold

Le joueur peut gagner du Gold grâce à :

- réponses correctes ;
- Daily ;
- streak ;
- victoires PvP ;
- bundle de missions hebdomadaires ;
- événements spéciaux ;
- récompenses de rang ;
- récompenses de saison ;
- certains achievements.

## Le Gold ne doit PAS être obtenu via

- défis entre amis ;
- simple complétion individuelle d'une mission hebdomadaire.

---

# 11. UTILISATION DU GOLD

Le Gold sert notamment à :

- acheter des cartes sur le marché ;
- acheter des avatars ;
- acheter des cadres ;
- acheter des backgrounds ;
- acheter des titres / éléments de personnalisation ;
- acheter des skins ;
- participer à certains événements spéciaux ;
- acheter certains packs.

Le Gold doit donc être une vraie monnaie de progression et surtout un Gold Sink.

---

# 12. ÉCONOMIE

Principe fondamental :

> Le jeu ne doit jamais devenir un système où les joueurs accumulent tellement de Gold qu'ils n'ont plus besoin de jouer.

Le marché ne doit pas créer de Gold.

Lorsqu'un joueur achète une carte à un autre :

Joueur A → Gold → Joueur B

Le système peut prélever une taxe de transaction.

Exemple :

- carte vendue 1 000 Gold ;
- vendeur reçoit 900 ;
- 100 Gold sont détruits.

Cette taxe constitue un Gold Sink.

Le marché devra également intégrer progressivement :

- historique des prix ;
- prix moyens ;
- limites raisonnables ;
- détection des comportements anormaux ;
- protections contre les manipulations.

Le marché n'est pas nécessaire pour le MVP.

---

# 13. PVP

Le PvP est un mode compétitif 1v1.

Objectif :

Créer une expérience différente du Daily.

Le Daily mesure principalement :

- connaissance ;
- vitesse ;
- performance personnelle.

Le PvP ajoute :

- adversaire humain ;
- ELO ;
- stratégie ;
- ban de catégorie ;
- revanche.

---

# 14. PVP — FORMAT

1v1.

Les deux joueurs répondent aux mêmes questions.

Le gagnant est celui qui obtient le meilleur résultat.

Si les joueurs ont le même nombre de bonnes réponses / le même score :

> le temps total de réponse départage les joueurs.

---

# 15. PVP — PHASE DE BAN

Chaque joueur dispose de 10 secondes.

Chaque joueur choisit secrètement une grande catégorie PvP à bannir.

Les deux bans sont verrouillés.

Les deux bans sont ensuite révélés simultanément.

Les questions ne peuvent provenir d'aucune des deux catégories bannies.

Il n'y a :

- aucune statistique de l'adversaire affichée ;
- aucune information permettant de connaître son niveau dans une catégorie avant le ban ;
- aucun deuxième ban.

Le but est de conserver une phase stratégique très courte.

---

# 16. GRANDES CATÉGORIES PVP

Les catégories PvP sont volontairement larges.

Exemple de catégories :

1. Histoire
2. Géographie
3. Sciences
4. Arts & Littérature
5. Culture Pop
6. Sports
7. Technologie
8. Économie & Politique
9. Nature
10. Divertissement

Le nombre exact de catégories pourra être ajusté selon le volume réel de questions.

Les catégories PvP doivent rester suffisamment larges pour éviter les chevauchements.

Exemple :

"Seconde Guerre mondiale"

est un sous-thème d'Histoire.

Ce n'est pas une catégorie PvP séparée.

---

# 17. PVP — SÉLECTION DES QUESTIONS

Après les deux bans :

- toutes les catégories restantes sont éligibles ;
- les questions sont sélectionnées dans ces catégories ;
- aucune question ne provient d'une catégorie bannie.

Pour éviter qu'une partie soit composée presque exclusivement d'un seul thème, la sélection PvP utilise une répartition équilibrée entre les catégories restantes.

Exemple :

S'il reste 8 catégories, les 10 questions sont réparties de manière aussi équilibrée que possible entre plusieurs catégories.

Une catégorie ne doit pas monopoliser une partie entière.

Le système doit également éviter de donner deux fois la même question dans une même partie.

---

# 18. PVP — MATCHMAKING

Le matchmaking cherche d'abord un adversaire avec un ELO proche.

Si aucun adversaire approprié n'est disponible :

1. élargissement progressif de la plage ELO ;
2. puis recherche plus large ;
3. possibilité de trouver un adversaire plus éloigné si nécessaire.

Objectif :

Éviter d'attendre plusieurs minutes pour trouver un match.

---

# 19. PVP — ELO

Le PvP utilise un système ELO.

Le gain / la perte dépend du niveau relatif des deux joueurs.

Battre un joueur mieux classé :

→ gain d'ELO plus important.

Perdre contre un joueur mieux classé :

→ perte d'ELO plus faible.

Battre un joueur moins bien classé :

→ gain plus faible.

Perdre contre un joueur moins bien classé :

→ perte plus importante.

---

# 20. RANGS

Le joueur n'a pas de niveau général classique.

Il possède un rang compétitif.

Exemple :

- Bronze
- Argent
- Or
- Platine
- Diamant
- Master
- Grandmaster

Chaque rang peut contenir plusieurs divisions.

Exemple :

Or III
Or II
Or I

L'ELO réel reste une valeur numérique interne.

Le rang est la représentation visible de cette valeur.

---

# 21. SAISONS

Les saisons PvP durent 6 mois.

À chaque nouvelle saison :

- le joueur effectue des matchs de placement ;
- son ELO de départ est déterminé à partir de ses performances ;
- un soft reset est appliqué.

Il ne faut pas remettre tout le monde au même niveau.

Un ancien Grandmaster ne doit pas être remis au même niveau qu'un débutant.

---

# 22. MATCHS DE PLACEMENT

Au début d'une saison, le joueur effectue plusieurs matchs de placement.

Le système utilise :

- ancien ELO ;
- résultats des matchs ;
- niveau des adversaires ;
- performances pendant les placements.

Le nombre exact de matchs pourra être ajusté après les tests.

---

# 23. RÉCOMPENSES DE SAISON

À la fin d'une saison, les joueurs reçoivent des récompenses selon leur meilleur / dernier rang selon les règles retenues.

Récompenses possibles :

- Gold ;
- badge ;
- titre ;
- skin ;
- cadre ;
- carte exclusive ;
- carte avec illustration alternative.

Les récompenses de saison doivent donner envie de jouer pendant toute la durée des 6 mois.

---

# 24. REVANCHE

Après un PvP, le joueur peut proposer une revanche.

La revanche est disponible contre :

- adversaire rencontré en matchmaking ;
- ami.

Une revanche ne donne pas de récompense Gold supplémentaire spécifique au fait d'avoir accepté une revanche.

---

# 25. MISSIONS HEBDOMADAIRES

Chaque semaine :

> 5 missions sont proposées.

Le joueur n'a pas besoin de toutes les accomplir.

Il choisit librement celles qu'il souhaite réaliser.

Pour obtenir la récompense hebdomadaire :

> il faut accomplir 3 missions sur 5.

Une mission individuelle ne donne aucune récompense.

La récompense est donnée uniquement lorsqu'on atteint 3/5.

---

# 26. BUNDLE HEBDOMADAIRE

La récompense pour 3 missions sur 5 contient :

- 1 pack ;
- une quantité de Gold.

Exemples de missions :

- répondre à 100 questions ;
- gagner 5 PvP ;
- faire 3 Daily ;
- obtenir 80 % de bonnes réponses en Histoire ;
- terminer 2 modes Survie.

Les missions doivent encourager plusieurs modes de jeu.

---

# 27. CARTES

Les cartes constituent le système de collection principal.

Une carte représente un élément de culture générale.

Exemples :

## Personnes

- Napoléon
- Albert Einstein
- Cléopâtre
- Mozart
- Marie Curie

## Événements

- Révolution française
- Apollo 11
- Première Guerre mondiale

## Lieux

- Paris
- Rome
- Machu Picchu

## Objets / inventions

- Téléphone
- Machine à vapeur
- Bombe atomique

## Animaux

- Dauphin
- Tigre
- Aigle
- etc.

---

# 28. RARETÉS DES CARTES

Raretés :

- Common
- Uncommon
- Rare
- Epic
- Legendary
- Mythic

Une carte peut également exister en version :

> Shiny

Une Shiny possède une apparence spéciale :

- illustration différente ;
- effet visuel ;
- bordure spéciale ;
- apparence métallique / argentée / platine.

La Shiny n'apporte aucun avantage en jeu.

---

# 29. CARTES = COLLECTION + APPRENTISSAGE

Chaque carte possède une courte fiche éducative.

Exemple :

Napoléon Bonaparte
Legendary

Résumé :

"Napoléon Bonaparte est un militaire et homme d'État français devenu empereur des Français en 1804. Il a profondément marqué l'histoire européenne par ses conquêtes, ses réformes administratives et le Code civil."

La longueur doit rester courte.

Objectif :

Une carte doit être agréable à collectionner mais également permettre d'apprendre quelque chose.

---

# 30. CARTES ET GAMEPLAY

Les cartes ne donnent aucun avantage compétitif.

Elles ne doivent pas :

- augmenter le score ;
- augmenter l'ELO ;
- donner de bonus PvP ;
- modifier les probabilités de victoire.

Principe :

> Aucun Pay-to-Win.

Les cartes servent à :

- collectionner ;
- apprendre ;
- afficher son statut ;
- compléter les albums ;
- personnaliser son profil.

---

# 31. PACKS

Trois packs principaux :

## Bronze

5 cartes.

Probabilités orientées vers les faibles raretés.

## Silver

5 cartes.

Probabilités améliorées.

## Gold

5 cartes.

Probabilités encore meilleures.

Les probabilités exactes seront définies et équilibrées avant la sortie.

Les packs ne doivent pas être perçus comme un système de casino.

Les récompenses doivent rester principalement orientées vers la collection et l'apprentissage.

---

# 32. ALBUMS

Les cartes sont organisées en albums thématiques.

Exemples :

- Histoire de France
- Conquête spatiale
- Grands scientifiques
- Antiquité
- Grandes inventions
- etc.

Chaque album possède un ensemble de cartes à collectionner.

---

# 33. RÉCOMPENSE D'ALBUM

Compléter un album donne :

> une carte exclusive.

Cette carte :

- ne peut pas être obtenue dans les packs normaux ;
- ne peut pas être obtenue ailleurs ;
- devient une preuve de complétion.

Elle peut posséder :

- une illustration spéciale ;
- une rareté particulière ;
- une apparence unique.

---

# 34. ÉCHANGE DE CARTES

Un onglet dédié permet de proposer des échanges.

Exemple :

Joueur A propose :

- 1 carte A
- 1 carte B

contre :

- 1 carte C

Joueur B accepte ou refuse.

Les échanges doivent être confirmés par les deux joueurs.

---

# 35. MARCHÉ

Les joueurs peuvent vendre leurs cartes contre du Gold.

Un joueur peut :

- mettre une carte en vente ;
- fixer un prix ;
- acheter une carte à un autre joueur.

Le marché ne doit pas créer de Gold.

Il redistribue le Gold entre les joueurs et détruit une partie via les frais de transaction.

---

# 36. ENCHÈRES

Certaines cartes peuvent être proposées dans des enchères limitées dans le temps.

Exemple :

Carte Legendary

Durée :

30 minutes.

Les joueurs enchérissent en Gold.

Le plus offrant obtient la carte.

Les enchères servent notamment aux cartes rares.

---

# 37. FRIENDS

Les joueurs peuvent :

- ajouter des amis ;
- supprimer des amis ;
- voir leur profil ;
- comparer leurs statistiques ;
- voir leurs achievements ;
- voir leur collection ;
- les défier ;
- proposer une revanche.

---

# 38. PROFIL JOUEUR

Le profil affiche notamment :

- username ;
- rang ;
- streak ;
- statistiques ;
- statistiques par catégorie ;
- nombre de cartes possédées ;
- achievements ;
- badges ;
- titres ;
- avatar ;
- cadre ;
- background ;
- skin ;
- collection.

Le profil n'affiche pas nécessairement le nombre total de cartes disponibles dans le jeu.

Exemple :

> 147 cartes

plutôt que :

> 147 / 1 250 cartes

---

# 39. STATISTIQUES

Le joueur dispose de statistiques personnelles.

Exemples :

- nombre total de questions répondues ;
- taux de bonnes réponses ;
- temps moyen de réponse ;
- performances par catégorie ;
- nombre de victoires PvP ;
- nombre de parties PvP ;
- historique du classement.

Les statistiques servent notamment à construire une identité de joueur.

---

# 40. PROFIL INTELLECTUEL

Le jeu peut progressivement identifier le profil intellectuel du joueur.

Exemples :

- L'Historien
- Le Géographe
- Le Scientifique
- L'Explorateur
- L'Érudit
- Le Curieux

Le profil est basé sur les performances réelles dans les différentes catégories.

Ce n'est pas un niveau.

Ce n'est pas une note d'intelligence.

C'est une représentation ludique des domaines dans lesquels le joueur est particulièrement performant.

---

# 41. ACHIEVEMENTS / BADGES

Le jeu possède des achievements.

Exemples :

- 7 jours de streak ;
- 30 jours de streak ;
- 100 victoires PvP ;
- 10/10 au Daily ;
- collectionneur ;
- plusieurs albums terminés ;
- atteindre Diamant ;
- gagner un événement ;
- répondre à 1 000 questions.

Les badges peuvent être affichés sur le profil.

---

# 42. TITRES

Les joueurs peuvent débloquer des titres.

Exemples :

- L'Historien
- Le Géographe
- L'Érudit
- Le Sans-Faute
- Le Rapide
- Le Collectionneur
- Le Challenger
- Le Maître
- L'Encyclopédie

Le joueur peut choisir le titre affiché sur son profil.

---

# 43. PERSONNALISATION

Le joueur peut personnaliser :

- avatar ;
- cadre ;
- background ;
- titre ;
- badge affiché ;
- skin.

La personnalisation est achetée principalement avec du Gold ou obtenue via des récompenses.

Les animations complexes ne sont pas nécessaires dans la première version.

---

# 44. LIGUES PRIVÉES

Les joueurs peuvent créer des ligues privées avec leurs amis.

Une ligue privée :

- est sur invitation ;
- permet de comparer plusieurs amis ;
- possède son propre classement ;
- fonctionne indépendamment de l'ELO mondial.

Les points de la ligue privée servent uniquement au classement interne.

Les défis entre amis ne donnent pas de Gold.

---

# 45. SOCIAL POST-GAME

Après une partie, les joueurs peuvent utiliser des réactions rapides.

Exemples :

- GG
- Bien joué
- Revanche ?
- 😎
- 🔥
- 😂
- 😭
- 🧠
- 👏

Pas de chat libre au lancement.

---

# 46. PAS DE CHAT COMMUNAUTAIRE AU LANCEMENT

Pas de :

- forum ;
- chatbox générale ;
- salon communautaire ;
- chat public.

Objectif :

Limiter la modération et garder le produit centré sur le jeu.

---

# 47. ACTUALITÉ / CULTURE DU MOMENT

Le jeu peut intégrer ponctuellement des questions liées à l'actualité.

Exemples :

- événement scientifique récent ;
- événement sportif ;
- découverte ;
- événement culturel ;
- événement politique majeur ;
- événement technologique.

Ces questions peuvent être temporaires.

---

# 48. NOTIFICATION "LE SAVIEZ-VOUS ?"

Le joueur peut recevoir une notification avec une information intéressante récemment survenue dans le monde.

Exemple :

"Le saviez-vous ? Une nouvelle découverte scientifique vient d'être annoncée..."

Cette fonctionnalité doit être pensée comme un outil de :

- rétention ;
- curiosité ;
- apprentissage.

Elle ne doit pas remplacer le Daily.

---

# 49. NUIT DES ÉRUDITS

"La Nuit des Érudits" est l'événement compétitif majeur du jeu.

C'est un tournoi spécial.

L'entrée coûte du Gold.

Le tournoi fonctionne par élimination / plusieurs manches.

Le vainqueur obtient :

- une importante récompense en Gold ;
- une carte extrêmement rare ;
- une carte exclusive à l'événement.

La carte exclusive ne peut pas être obtenue dans les packs normaux.

La fréquence exacte de l'événement sera définie ultérieurement.

---

# 50. CARTES EXCLUSIVES

Certaines cartes ne sont disponibles que via :

- albums complétés ;
- saisons ;
- Nuit des Érudits ;
- récompenses spéciales.

Elles servent à créer de vrais objets de prestige.

---

# 51. VARIANTES D'ILLUSTRATIONS

Une même carte peut exister avec différentes illustrations.

Exemple :

Napoléon — illustration classique.

Napoléon — illustration saison 1.

Napoléon — illustration événement.

Les variantes peuvent être réservées à :

- saisons ;
- événements ;
- albums ;
- achievements.

---

# 52. ANTI-CHEAT

Le système doit prévoir une protection contre :

- automatisation des réponses ;
- bots ;
- scripts ;
- multi-comptes abusifs ;
- manipulation du Daily ;
- manipulation de l'ELO ;
- comportements anormaux ;
- exploitation du système de Gold.

Le score doit être validé côté serveur.

Le client ne doit jamais être considéré comme source de vérité.

Le système doit notamment surveiller :

- temps de réponse impossibles ;
- séquences anormales ;
- comportement automatisé ;
- répétition suspecte ;
- anomalies de matchmaking.

---

# 53. SIGNALER UNE QUESTION

Le joueur peut signaler une question.

Motifs :

- mauvaise réponse ;
- question ambiguë ;
- faute ;
- question obsolète ;
- autre problème.

Les questions signalées peuvent être vérifiées par l'administration.

Objectif :

Maintenir une base de questions fiable.

---

# 54. QUALITÉ DES QUESTIONS

La qualité des questions est critique.

Chaque question doit idéalement posséder :

- question ;
- réponse attendue ;
- variantes acceptées ;
- catégorie ;
- sous-catégorie ;
- difficulté ;
- explication ;
- source / justification interne ;
- statut de validation.

Les réponses textuelles doivent accepter les variantes raisonnables.

Exemple :

"États-Unis"

doit pouvoir accepter :

"USA"

"Etats-Unis"

"États Unis"

etc.

Le système doit éviter les faux négatifs dus à l'orthographe ou à des variantes évidentes.

---

# 55. DIFFICULTÉ

Les questions possèdent une difficulté.

Exemple :

- Facile
- Moyenne
- Difficile
- Très difficile

La difficulté est indépendante de la rareté des cartes.

Une question difficile ne donne pas nécessairement une meilleure carte.

---

# 56. DESIGN DES QUESTIONS

Les questions doivent privilégier :

- une réponse claire ;
- une formulation courte ;
- une difficulté raisonnable ;
- une information vérifiable ;
- une réponse non ambiguë.

Éviter :

- questions pièges artificielles ;
- formulations trop longues ;
- connaissances ultra obscures sans intérêt ;
- questions dépendant d'une interprétation subjective.

---

# 57. IDENTITÉ DU JEU

Le jeu doit donner au joueur l'impression d'être :

> "la personne qui connaît énormément de choses."

Pas simplement :

> "une personne qui répond à des quiz."

Cette différence est fondamentale.

La collection, les cartes, les albums, les titres, les badges, les profils intellectuels et les classements servent tous cette identité.

---

# 58. PRINCIPES DE DESIGN

## Principe 1 — Le Daily est roi

Le Daily est le rendez-vous quotidien.

## Principe 2 — Pas de Pay-to-Win

Aucun achat ou objet ne doit donner un avantage compétitif.

## Principe 3 — Les cartes ont une vraie valeur culturelle

Une carte doit apprendre quelque chose.

## Principe 4 — Le PvP doit être rapide

Pas de lobby complexe.

## Principe 5 — Le social doit rester sain

Pas de chat libre au lancement.

## Principe 6 — Le Gold doit circuler

Le jeu doit avoir des Gold Sinks.

## Principe 7 — La collection doit durer

Les cartes exclusives donnent une raison de rester longtemps.

## Principe 8 — Le joueur doit toujours comprendre pourquoi il gagne

Scores, ELO, récompenses et progression doivent être lisibles.

---

# 59. CE QUI N'EST PAS DANS LE PROJET

Les fonctionnalités suivantes sont explicitement hors périmètre actuel :

- système de niveau joueur général ;
- système de maîtrise par catégorie ;
- quiz personnalisés générés par IA ;
- chat communautaire ;
- forum ;
- chatbox générale ;
- mode de jeu en groupe ;
- records personnels ;
- ligues publiques hebdomadaires ;
- événements temporaires génériques ;
- statistiques de l'adversaire pendant le ban PvP ;
- avantages gameplay liés aux cartes ;
- Pay-to-Win.

---

# 60. ARCHITECTURE DES GRANDES SECTIONS DU PRODUIT

Navigation principale possible :

1. Daily
2. Jouer
3. Collection
4. Marché
5. Amis
6. Classement
7. Profil

Avec éventuellement :

- Missions ;
- Albums ;
- Nuit des Érudits ;
- Boutique / personnalisation.

---

# 61. ÉCRAN D'ACCUEIL

L'écran d'accueil doit principalement pousser le Daily.

Exemple :

"Daily #142"

10 questions
25 secondes par question

[COMMENCER]

Puis afficher :

- streak ;
- prochain rappel ;
- rang ;
- missions ;
- derniers résultats ;
- amis.

Le Daily doit être visuellement dominant.

---

# 62. STRUCTURE DU JEU À LONG TERME

Le joueur doit avoir plusieurs raisons de revenir :

## Aujourd'hui

Faire son Daily.

## Cette semaine

Terminer 3 missions sur 5.

## Cette saison

Monter son rang PvP.

## À long terme

Compléter sa collection.

## Avec ses amis

Les battre dans les défis et ligues privées.

## Régulièrement

Participer à la Nuit des Érudits.

---

# 63. MVP

Le MVP ne doit PAS contenir tout le jeu.

Priorité absolue :

### MVP 1

- compte joueur ;
- Daily ;
- 10 questions ;
- réponses textuelles ;
- timer ;
- scoring ;
- streak ;
- classement Daily ;
- partage du résultat ;
- base de questions ;
- Training simple ;
- notifications / rappels ;
- profil basique ;
- statistiques basiques.

### MVP 2

- PvP ;
- matchmaking ;
- ELO ;
- rangs ;
- ban de catégories ;
- revanche ;
- amis ;
- réactions post-game ;
- missions hebdomadaires.

### V2

- cartes ;
- packs ;
- collection ;
- albums ;
- Gold ;
- personnalisation ;
- achievements ;
- titres ;
- profil avancé.

### V3

- marché ;
- échanges ;
- enchères ;
- saisons complètes ;
- cartes exclusives ;
- ligues privées ;
- Nuit des Érudits ;
- actualités / questions temporaires ;
- économie avancée.

---

# 64. ORDRE DE PRIORITÉ ABSOLU

Si le développement doit être réduit au minimum :

## Priorité S

1. Daily
2. Questions de qualité
3. Scoring
4. Streak
5. Classement Daily
6. Partage

## Priorité A

7. Training
8. Notifications
9. PvP
10. ELO
11. Rangs
12. Missions
13. Amis

## Priorité B

14. Cartes
15. Packs
16. Gold
17. Collection
18. Albums
19. Achievements
20. Personnalisation

## Priorité C

21. Marché
22. Échanges
23. Enchères
24. Ligues privées
25. Nuit des Érudits
26. Actualité
27. Systèmes économiques avancés

---

# 65. OBJECTIF DU PREMIER TEST

Avant de développer toute l'économie et la collection, il faut vérifier une chose :

> Est-ce que les gens ont envie de revenir faire le Daily demain ?

Le premier prototype doit donc mesurer :

- taux de complétion du Daily ;
- taux de retour J+1 ;
- taux de retour J+7 ;
- nombre de Daily effectués ;
- temps moyen passé ;
- partage ;
- satisfaction ;
- volonté de rejouer.

Si le Daily n'est pas amusant, aucune carte, aucun marché et aucun système d'ELO ne sauvera le produit.

---

# 66. VISION FINALE

Le produit final doit combiner :

QUIZ
+
COMPÉTITION
+
COLLECTION
+
SOCIAL
+
APPRENTISSAGE
+
RÉTENTION.

Le joueur vient d'abord pour répondre à 10 questions.

Puis il revient pour :

- battre son score ;
- conserver son streak ;
- monter son ELO ;
- battre ses amis ;
- gagner du Gold ;
- obtenir des cartes ;
- compléter des albums ;
- débloquer des titres ;
- participer à la Nuit des Érudits ;
- construire une collection prestigieuse.

Le jeu doit devenir progressivement :

> "Le jeu de culture générale auquel tu reviens tous les jours."

---

# 67. RÈGLE FINALE DE PRODUIT

Ne pas construire toutes les fonctionnalités immédiatement.

Construire dans cet ordre :

DAILY
→ RÉTENTION
→ PVP
→ COMPÉTITION
→ COLLECTION
→ SOCIAL
→ ÉCONOMIE
→ ENDGAME

Chaque nouvelle fonctionnalité doit répondre à une question :

> Est-ce que cette fonctionnalité donne une bonne raison au joueur de revenir ?

Si la réponse est non, elle n'est pas prioritaire.
