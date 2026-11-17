# Cahier des charges

## Objectif

Préparer ses courses rapidement et utiliser la liste Courses d’une main en magasin, y compris quand le réseau est absent. La V1 vise Safari sur iPhone et la PWA installée depuis l’écran d’accueil. L’interface est en français.

| Réf. | Besoin | Résultat attendu |
| --- | --- | --- |
| F01 | Préparer les achats | Ajouter, modifier, déplacer et supprimer des articles. Afficher leur quantité et les regrouper par catégorie. |
| F02 | Organiser les rayons | Créer, renommer, personnaliser et réordonner des catégories. Supprimer une catégorie remet ses articles dans « Sans catégorie ». |
| F03 | Faire ses courses | Cocher et décocher d’un toucher, voir combien d’articles restent et retirer les articles pris ou vider Courses après confirmation. |
| F04 | Utiliser les gestes | Glisser à gauche pour afficher Modifier/Supprimer, à droite pour ajouter aux Courses sans doublon. Réorganiser à la poignée. Les actions restent disponibles dans un menu. |
| F05 | Fonctionner hors ligne | Après la première ouverture en ligne, rouvrir l’app et effectuer les actions F01 à F04 sans réseau. Les changements restent après relance. |
| F06 | Protéger et récupérer la liste | Exporter et importer un fichier chiffré. Sur activation, conserver aussi des instantanés chiffrés privés dans Supabase et restaurer avec la phrase de récupération. |

## Hypothèses de V1

Un catalogue et une liste Courses par installation, quantités libres telles que « 500 g », noms d’articles en double autorisés. La sauvegarde est facultative, automatique au premier plan une fois déverrouillée, et vise la récupération. Collaboration, synchronisation, codes-barres et publication App Store sont hors périmètre. Les comportements détaillés et les paramètres marqués « à valider » sont suivis dans le [plan](plan-de-livraison.md).
