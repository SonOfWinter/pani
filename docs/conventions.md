# Conventions de contribution

- Une modification liée à un ticket PANI, avec portée et critères vérifiables. Mentionner le ticket dans la branche, la demande de revue ou le commit.
- Documentation et interface en français. Identifiants techniques en anglais. Noms métier cohérents entre UX, stockage et tests.
- TypeScript strict. Valider à l’entrée les données provenant des formulaires, d’IndexedDB quand le schéma l’exige et des sauvegardes. Préférer les transactions aux écritures dispersées.
- Réutiliser les composants shadcn/ui adaptés et les variables de thème. Vérifier les alternatives clavier et VoiceOver dès qu’une interaction change.
- Une décision durable qui modifie les contrats de données, l’architecture ou la sécurité reçoit un ADR. Consigner le contexte, la décision et ses conséquences.
- Après `npm ci`, Husky configure les hooks Git de ce clone. Si une configuration Git personnelle utilise déjà `core.hooksPath`, vérifier sa valeur effective avec `git config --show-origin --get core.hooksPath`. Husky donne la priorité au chemin du dépôt pour ce clone. Pour garder une configuration personnelle active lors de l’installation des dépendances, utiliser `HUSKY=0 npm ci` tant que le chemin effectif est celui de cette configuration.
- Le commit lance ESLint sur le code indexé, sans modifier les fichiers. En cas d’indexation partielle d’un fichier de code, indexer la version complète ou mettre temporairement de côté les changements hors index avant de relancer le commit.
- Le push lance TypeScript et Vitest sur le répertoire de travail. Les contrôles GitHub Actions s’exécutent sur le contenu soumis. Voir la [stratégie de tests](tests.md) pour les vérifications propres à chaque changement.
