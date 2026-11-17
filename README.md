# Pani

Pani est une application web progressive (PWA) de liste de courses, installable sur mobile. Préparez vos achats dans **Liste**, puis cochez-les en magasin dans **Courses**, même hors ligne. Une sauvegarde chiffrée facultative permet de retrouver la liste sur un autre appareil.

## Démarrage local

Avec Node.js 22.12 ou ultérieur, installer les dépendances via `npm ci`, puis lancer `npm run dev`. Vite affiche l’adresse locale. Le fichier de verrouillage fixe les versions utilisées par le projet.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Ces vérifications sont aussi configurées dans GitHub Actions. Pour la recette navigateur, lancer `npx playwright install chromium webkit`, puis `npm run build` et `npm run test:e2e`. Pour activer le cloud et tester l’isolation des comptes, voir [la configuration Supabase](supabase/README.md).

## Documentation

- [Cahier des charges](docs/cahier-des-charges.md)
- [Spécifications UX](docs/ux.md)
- [Architecture](docs/architecture.md)
- [Modèle de données](docs/donnees.md)
- [Sauvegarde et chiffrement](docs/sauvegarde.md)
- [Stratégie de tests](docs/tests.md)
- [Plan de livraison](docs/plan-de-livraison.md)
- [Conventions de contribution](docs/conventions.md)
- [Décisions d’architecture](docs/adr/README.md)
- [Consignes pour les agents IA](AGENTS.md)
