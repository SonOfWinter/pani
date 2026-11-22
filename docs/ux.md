# Spécifications UX

## Identité

Soft Native reprend les habitudes iPhone. Fond noir, texte blanc et accent bordeaux vif. Le fond des lignes de catégories et des en-têtes fins et arrondis de Liste et Courses reprend leur couleur. Le nom et l’emoji restent lisibles grâce à un texte noir ou blanc selon le contraste. Les listes se composent de lignes séparées, sans encadrement de section. Les séparateurs sont fins et la police suit le système. Les couleurs, espacements, rayons et états de focus passent par des variables CSS. Écarter les motifs Material Design.

## Écrans et gestes

| Écran | Parcours |
| --- | --- |
| Liste | Titre de la vue, compteur d’articles à acheter, champ de recherche par nom dans la vue Liste et sections par catégorie, y compris les catégories vides. Glisser un article vers la droite l’ajoute aux Courses ou indique qu’il y est déjà. Chaque ligne se termine par les boutons « − » et « + » autour de la quantité. Le bouton « Ajouter un article » ouvre un panneau bas avec nom, quantité facultative et catégorie. La validation ramène le focus au déclencheur ou au nouvel article. |
| Courses | Afficher les articles à acheter par rayon. Un toucher coche l’article et actualise le compteur. Le bouton « Annuler » remet le dernier article coché parmi les achats à faire. Les boutons de quantité restent disponibles. Les articles pris restent dans une section repliable avec possibilité de décocher. « Retirer les articles pris » demande confirmation et conserve les achats restants. La poubelle vide entièrement Courses après confirmation. Les articles restent dans Liste. |
| Catégories | Ouvrir un panneau du bas pour ajouter ou modifier une catégorie. Saisir son nom, choisir sa couleur avec le sélecteur et saisir un emoji au clavier. Réordonner les catégories depuis leur poignée. Pour supprimer, annoncer que les articles iront dans « Sans catégorie ». Présenter un aperçu de l’ordre des rayons. |
| Sauvegarde | Montrer le dernier succès et l’état courant. Expliquer la différence entre compte et phrase de récupération. Pour restaurer, afficher un aperçu après déchiffrement, puis demander de confirmer le remplacement local. |

- La barre inférieure fixe donne accès à Liste, Courses et Catégories.
- En Liste, faire glisser une ligne vers la gauche la décale pour révéler les actions derrière elle. Glisser vers la droite referme les actions si elles sont ouvertes et ajoute sinon l’article aux Courses. Le geste seul n’efface rien. Un défilement vertical garde la priorité. Toucher le nom de l’article ou l’activer au clavier ouvre les actions, dont « Ajouter aux courses ». Le raccourci Alt + flèche droite ajoute directement l’article lorsque le menu est fermé.
- Le déplacement démarre depuis une poignée dédiée. Déposer un article sur une ligne ou dans une section, même vide. Relâcher hors cible ou annuler conserve l’ordre initial. L’édition de l’article permet de changer de catégorie, y compris pendant une recherche.
- Prévoir les états liste vide, aucun résultat, courses terminées, erreur d’écriture et sauvegarde indisponible. Une erreur d’écriture conserve la saisie pour réessayer. Hors ligne, les commandes locales restent disponibles.
- Cibles tactiles d’au moins 44 × 44 pixels CSS, libellés VoiceOver, focus visible, contraste WCAG AA, zoom, zones sûres iOS et mouvements réduits. Après déplacement ou coche, annoncer le résultat aux technologies d’assistance et maintenir un focus logique.

- Les panneaux d’article, de catégorie et de sauvegarde montent depuis le bas et verrouillent le défilement de la page. Un toucher en dehors ou Échap les ferme. Les suppressions et retraits ouvrent une confirmation qui utilise les composants de Pani. Les notifications temporaires confirment les créations, modifications et suppressions, ou indiquent un ajout aux Courses déjà effectué. Le témoin de navigation suit la vue sélectionnée. Les transitions respectent le réglage de mouvements réduits.
