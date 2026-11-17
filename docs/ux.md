# Spécifications UX

## Identité

Soft Native reprend les habitudes iPhone. Fond blanc, texte noir et surfaces gris légèrement émeraude. Les catégories portent un repère de couleur et un emoji. Le thème sombre suit le système. Les séparateurs sont fins et la police suit le système. Les couleurs, espacements, rayons et états de focus passent par des variables CSS. Écarter les motifs Material Design.

## Écrans et gestes

| Écran | Parcours |
| --- | --- |
| Liste | Titre de la vue, compteur d’articles à acheter, recherche par nom déclenchée par la loupe du menu inférieur et sections par catégorie, y compris les catégories vides. Chaque ligne se termine par les boutons « − » et « + » autour de la quantité. Le bouton « Ajouter un article » ouvre un panneau bas avec nom, quantité facultative et catégorie. La validation ramène le focus au déclencheur ou au nouvel article. |
| Courses | Afficher les articles à acheter par rayon. Un toucher coche l’article et actualise le compteur. Le bouton « Annuler » remet le dernier article coché parmi les achats à faire. Les boutons de quantité restent disponibles. Les articles pris restent dans une section repliable avec possibilité de décocher. « Retirer les articles pris » demande confirmation et conserve les autres. |
| Catégories | Modifier le libellé, choisir la couleur dans un sélecteur et choisir un emoji proposé ou saisi au clavier. Pour supprimer, annoncer que les articles iront dans « Sans catégorie ». Présenter un aperçu de l’ordre des rayons. |
| Sauvegarde | Montrer le dernier succès et l’état courant. Expliquer la différence entre compte et phrase de récupération. Pour restaurer, afficher un aperçu après déchiffrement, puis demander de confirmer le remplacement local. |

- La barre inférieure fixe donne accès à Liste, Courses et Catégories, avec une loupe à droite.
- En Liste, faire glisser une ligne vers la gauche la décale pour révéler les actions derrière elle. Le geste seul n’efface rien. Un défilement vertical garde la priorité. Le menu de ligne donne accès aux mêmes actions.
- Le déplacement démarre depuis une poignée dédiée. Déposer un article sur une ligne ou dans une section, même vide. Relâcher hors cible ou annuler conserve l’ordre initial. Le menu propose Monter et Descendre. L’édition de l’article permet de changer de catégorie, y compris pendant une recherche.
- Prévoir les états liste vide, aucun résultat, courses terminées, erreur d’écriture et sauvegarde indisponible. Une erreur d’écriture conserve la saisie pour réessayer. Hors ligne, les commandes locales restent disponibles.
- Cibles tactiles d’au moins 44 × 44 pixels CSS, libellés VoiceOver, focus visible, contraste WCAG AA, zoom, zones sûres iOS et mouvements réduits. Après déplacement ou coche, annoncer le résultat aux technologies d’assistance et maintenir un focus logique.
