# Stratégie de tests

| Niveau | Outils | Cas à couvrir |
| --- | --- | --- |
| Unitaire | Vitest | Validation des noms, quantités et références. Calcul du compteur, tri stable, transitions de coche et choix de la prochaine révision à envoyer. |
| Intégration | Vitest + IndexedDB de test, puis navigateur réel | Migrations depuis chaque schéma livré, annulation de transaction, réaffectation d’une catégorie, déplacement concurrent et restauration atomique. |
| Chiffrement | Web Crypto réel | Export/import aller-retour, phrase erronée, en-tête ou données altérées, limites de taille et de dérivation, format ancien ou futur et IV distincts. |
| Cloud | Projet Supabase de test, deux comptes | A peut déposer, lire et supprimer ses instantanés. B ne peut ni les lister ni les lire, les écraser ou les supprimer, même avec un chemin connu. Vérifier session expirée et reprise réseau. |
| Fonctionnel | Playwright dans Chromium et WebKit | Ajouter, rechercher, modifier, déplacer, cocher, décocher, retirer les pris. Contrôler persistance, relance hors ligne après installation du shell et passage d’une version à l’autre. |
| Recette iPhone | Safari et PWA écran d’accueil | Mode avion après préparation, fermeture et relance, swipe sans conflit de défilement, déplacement de catégorie, clavier et zones sûres, VoiceOver, contraste, thème sombre et restauration sur installation vierge. |

## Exécution

- `npm run lint`, `npm run typecheck` et `npm test` vérifient le code local. Vitest utilise une base IndexedDB fictive pour la persistance et les migrations.
- Installer Chromium et WebKit avec `npx playwright install chromium webkit`, lancer `npm run build` puis `npm run test:e2e`. Playwright sert le build de production et isole les contextes. La recette couvre notamment l’ajout de Liste à Courses depuis le menu au clavier, puis la relance hors ligne.
- GitHub Actions exécute ces commandes avec `HUSKY=0`. Les essais cloud utilisent des comptes et des données fictifs dans un projet Supabase de test.

Pour cadrer une optimisation de Liste ou Courses, reprendre le [protocole de mesure](performances.md).

## Recette manuelle

Noter la version iOS, le modèle, le mode Safari/PWA et le résultat lors de la recette. Le WebKit automatisé complète le test sur iPhone. Le passage en production exige la réussite de la recette hors ligne, de la migration et d’une restauration réelle sur un second environnement.
