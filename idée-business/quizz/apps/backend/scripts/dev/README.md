# Scripts de développement

Scripts utiles pour le développement et les tests.

## Reset Daily Challenge

Supprime le Daily d'aujourd'hui pour le régénérer avec de nouvelles questions.

### Utilisation

```bash
npm run reset:daily
```

ou directement :

```bash
npx tsx scripts/dev/reset-daily.ts
```

### Ce que fait le script

1. Trouve le Daily d'aujourd'hui (basé sur la date UTC)
2. Supprime le Daily et toutes les soumissions associées
3. Le prochain appel à `/api/daily/today` générera un nouveau Daily avec 10 nouvelles questions

### Quand l'utiliser

- Après avoir ajouté de nouvelles catégories de questions
- Pour tester la distribution des questions
- Pour refaire le Daily sans attendre minuit UTC
- Pendant le développement pour tester rapidement

### Note

Le Daily se régénère automatiquement chaque jour à minuit UTC. Ce script est uniquement pour le développement/tests.
