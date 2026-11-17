# Pani

Pani est une liste de courses installable sur iPhone. Préparez vos achats dans **Liste**, puis cochez-les en magasin dans **Courses**, même hors ligne. Une sauvegarde chiffrée facultative permet de retrouver la liste sur un autre appareil.

## Démarrage local

Avec Node.js 22.12 ou ultérieur, installer les dépendances via `npm ci`, puis lancer `npm run dev`. Vite affiche l’adresse locale. Le fichier de verrouillage fixe les versions utilisées par le projet.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Ces vérifications sont aussi configurées dans GitHub Actions.

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
