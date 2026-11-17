# Conventions de contribution

- Une modification liée à un ticket PANI, avec portée et critères vérifiables. Mentionner le ticket dans la branche, la demande de revue ou le commit.
- Documentation et interface en français. Identifiants techniques en anglais. Noms métier cohérents entre UX, stockage et tests.
- TypeScript strict. Valider à l’entrée les données provenant des formulaires, d’IndexedDB quand le schéma l’exige et des sauvegardes. Préférer les transactions aux écritures dispersées.
- Réutiliser les composants shadcn/ui adaptés et les variables de thème. Vérifier les alternatives clavier et VoiceOver dès qu’une interaction change.
- Une décision durable qui modifie les contrats de données, l’architecture ou la sécurité reçoit un ADR. Consigner le contexte, la décision et ses conséquences.
- Après initialisation, vérifier formatage, lint, types, build et tests pertinents. Documenter les vérifications manuelles restant à faire. Employer des données fictives et un environnement séparé pour les tests cloud.
