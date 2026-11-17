# Modèle de données

| Collection | Champs | Contraintes |
| --- | --- | --- |
| Articles | identifiant UUID, nom, quantité, catégorie, position, date de coche, création, modification | Nom normalisé par suppression des espaces périphériques et non vide. Quantité texte facultative. Catégorie nulle ou valide. Date de coche nulle pour un article à acheter. |
| Catégories | identifiant UUID, nom, couleur, icône, position, création, modification | Nom non vide, unique après normalisation de casse et des espaces périphériques. Couleur et icône choisies dans des palettes prises en charge. |
| État local | dernière vue, révision des données, dernière sauvegarde réussie | La révision augmente à chaque mutation métier. Les préférences d’interface et les métadonnées de sauvegarde restent locales à l’installation. |

« Sans catégorie » correspond à une référence nulle. Le groupe s’affiche après les catégories personnalisées et reste disponible comme destination. Dans chaque groupe, l’ordre des articles est commun aux deux vues. Cocher change uniquement la date de coche et celle de modification. Les dates se sérialisent en UTC.

Prévoir un index de catégorie et d’ordre pour les articles, un index de position pour les catégories et des index supplémentaires seulement selon les requêtes. Utiliser un emplacement persistant pour le groupe sans catégorie compatible avec les clés IndexedDB. Les positions sont des entiers ordonnés dans leur groupe. Une réorganisation réécrit les positions concernées dans une seule transaction, y compris quand un article change de catégorie. Un déplacement concurrent s’applique à partir de l’ordre relu dans la transaction ou échoue sans écriture si la cible a disparu.

La suppression d’une catégorie réaffecte ses articles à la fin de « Sans catégorie » dans la même transaction. Le remplacement lors d’une restauration valide types, identifiants uniques, références, dates et positions avant toute écriture. Les versions de la base Dexie et du format de sauvegarde évoluent séparément. Tester chaque migration sur un jeu de données antérieur.
