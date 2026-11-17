# Spécifications UX

## Identité

Soft Native reprend les habitudes iPhone. Fond blanc cassé, accent sauge, catégories pastel avec texte et icône, séparateurs fins, police système Apple et rayons de 12 à 16 px pour les contrôles. Le thème sombre suit le système avec des surfaces charbon et des accents lisibles. Les couleurs, espacements, rayons et états de focus passent par des variables CSS. Écarter les motifs Material Design.

## Écrans et gestes

| Écran | Parcours |
| --- | --- |
| Liste | En-tête Pani, compteur d’articles à acheter, navigation segmentée Liste/Courses, recherche par nom et sections par catégorie. Le bouton « Ajouter un article » ouvre un panneau bas avec nom, quantité facultative et catégorie. La validation ramène le focus au déclencheur ou au nouvel article. |
| Courses | Afficher les articles à acheter par rayon. Un toucher coche l’article et actualise le compteur. Les articles pris restent dans une section repliable avec possibilité de décocher. « Retirer les articles pris » demande confirmation et conserve les autres. |
| Catégories | Modifier le libellé, la couleur et l’icône. Pour supprimer, annoncer que les articles iront dans « Sans catégorie ». Présenter un aperçu de l’ordre des rayons. |
| Sauvegarde | Montrer le dernier succès et l’état courant. Expliquer la différence entre compte et phrase de récupération. Pour restaurer, afficher un aperçu après déchiffrement, puis demander de confirmer le remplacement local. |

- En Liste, un swipe horizontal révèle les boutons Modifier et Supprimer. Le geste seul n’efface rien. Un défilement vertical garde la priorité. Le menu de ligne donne accès aux mêmes actions.
- Le déplacement démarre depuis une poignée dédiée. Relâcher hors cible ou annuler rétablit l’ordre initial. Le menu propose Monter, Descendre et Changer de catégorie. Pendant une recherche, suspendre le réordonnancement et conserver le changement de catégorie via le menu.
- Prévoir les états liste vide, aucun résultat, courses terminées, erreur d’écriture et sauvegarde indisponible. Une erreur d’écriture conserve la saisie pour réessayer. Hors ligne, les commandes locales restent disponibles.
- Cibles tactiles d’au moins 44 × 44 pixels CSS, libellés VoiceOver, focus visible, contraste WCAG AA, zoom, zones sûres iOS et mouvements réduits. Après déplacement ou coche, annoncer le résultat aux technologies d’assistance et maintenir un focus logique.
