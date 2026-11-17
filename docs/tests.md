# Stratégie de tests

| Niveau | Outils envisagés | Cas à couvrir |
| --- | --- | --- |
| Unitaire | Vitest | Validation des noms, quantités et références. Calcul du compteur, tri stable, transitions de coche et choix de la prochaine révision à envoyer. |
| Intégration | Vitest + IndexedDB de test, puis navigateur réel | Migrations depuis chaque schéma livré, annulation de transaction, réaffectation d’une catégorie, déplacement concurrent et restauration atomique. |
| Chiffrement | Web Crypto réel | Export/import aller-retour, phrase erronée, en-tête ou données altérées, limites de taille et de dérivation, format ancien ou futur et IV distincts. |
| Cloud | Projet Supabase de test, deux comptes | A peut déposer, lire et supprimer ses instantanés. B ne peut ni les lister ni les lire, les écraser ou les supprimer, même avec un chemin connu. Vérifier session expirée et reprise réseau. |
| Fonctionnel | Playwright dans Chromium et WebKit | Ajouter, rechercher, modifier, déplacer, cocher, décocher, retirer les pris. Contrôler persistance, relance hors ligne après installation du shell et passage d’une version à l’autre. |
| Recette iPhone | Safari et PWA écran d’accueil | Mode avion après préparation, fermeture et relance, swipe sans conflit de défilement, déplacement de catégorie, clavier et zones sûres, VoiceOver, contraste, thème sombre et restauration sur installation vierge. |

Noter la version iOS, le modèle, le mode Safari/PWA et le résultat lors de la recette. Le WebKit automatisé complète le test sur iPhone. Le passage en production exige la réussite de la recette hors ligne, de la migration et d’une restauration réelle sur un second environnement.
