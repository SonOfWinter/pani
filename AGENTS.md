# Travailler sur Pani

Commencer par le [README](README.md), puis lire le ticket dans le dossier local `tickets/` et les spécifications liées. Si la fiche manque dans le clone, demander son contenu avant de commencer sa mise en œuvre. La demande courante détermine le périmètre autorisé. La phase de conception reste documentaire jusqu’à une demande explicite de développement.

- Préserver l’usage hors ligne des deux modes et la persistance dans IndexedDB. Les mutations métier passent par les services et transactions Dexie.
- Préserver les données existantes lors des migrations, mises à jour PWA et échecs de restauration.
- Limiter Supabase à Auth et Storage. Chiffrer le contenu des sauvegardes dans le navigateur avant tout envoi.
- Conserver une alternative accessible à chaque geste et vérifier les interactions sur iPhone.
- Ne jamais ajouter de clés, phrases de récupération, listes réelles ou sauvegardes utilisateur au dépôt, aux journaux ou aux tickets.
- Mettre à jour les spécifications et les ADR affectés par la modification. Signaler tout écart au ticket et toute vérification encore manuelle.
- Suivre les [conventions](docs/conventions.md) et la [stratégie de tests](docs/tests.md). Utiliser le skill `pani-quality` pour un changement de code, une revue ou une mesure de performance.
- Adapter les vérifications à la portée. Pour le code, lancer lint, types et les tests pertinents. Pour un changement d’interface ou de PWA, vérifier aussi le build et les parcours navigateur concernés. Les changements de documentation seuls se vérifient par la relecture et les liens.
- Dans le compte rendu, donner les commandes effectivement exécutées, leurs résultats et les contrôles restants, dont la recette sur iPhone lorsque l’interaction change.
