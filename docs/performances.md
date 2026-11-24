# Mesure de référence de Liste et Courses

Mesure locale du 22 novembre 2026 avec Playwright 1.65.1 sur macOS 26.6.2 arm64. Le build de production instrumenté a été généré dans une copie jetable avec la même feuille de style que le build normal. Chromium 159 et WebKit 27.2 ont tourné en mode headless, avec une fenêtre de 390 × 844, le toucher simulé, les mouvements réduits et le service worker bloqué pour la mesure.

## Protocole

1. Créer un contexte navigateur neuf pour chaque moteur et taille de liste. Initialiser IndexedDB en visitant Pani. Insérer 100 ou 1 000 articles fictifs dans 20 catégories, par groupes de cinq répartis entre les catégories. Un nom sur cinq contient « X », un article sur deux figure dans Courses et la moitié de ceux-ci est cochée. Recharger Liste.
2. Déclencher l’événement de saisie correspondant à la lettre « x » dans la recherche, puis effacer le filtre entre deux essais. Pour l’autre scénario, activer le bouton Courses et revenir à Liste après chaque essai. Attendre deux callbacks `requestAnimationFrame` après chaque mise à jour, y compris le retour à l’état initial. Écarter les cinq premiers essais de chaque scénario et conserver les 30 suivants.
3. Dans la copie instrumentée, relever `performance.now()` juste avant l’événement, encadrer le regroupement par deux marques et poser une marque dans un `useLayoutEffect` d’`App` quand la vue ou le filtre attendu est appliqué. Mesurer le travail React qui suit le regroupement jusqu’à cette marque. La mesure jusqu’au second callback d’image inclut l’attente des images et fournit un repère après la mise à jour visuelle. Elle dépend de la cadence du moteur.
4. Calculer la médiane des 15e et 16e valeurs triées et le 95e percentile à partir de la 29e valeur. La précision de l’horloge limite les petits écarts, particulièrement sous WebKit.

## Résultats

Chaque cellule indique la médiane et le 95e percentile, en millisecondes. Le regroupement est mesuré sur le rendu qui aboutit à la mise à jour attendue. La colonne React inclut la réconciliation et la mise à jour du DOM jusqu’à l’effet de layout de l’application. Le délai avant cette colonne peut inclure Dexie et la planification React lors du changement de mode. Le rendu du navigateur après la mise à jour du DOM est inclus dans le délai jusqu’au second callback d’image.

| Moteur | Articles | Action | Regroupement | React après regroupement | Événement → DOM | Événement → second callback d’image |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Chromium | 100 | Recherche | 0 / 0,1 | 3,3 / 4 | 3,5 / 4,4 | 32,6 / 33,2 |
| Chromium | 100 | Liste → Courses | 0 / 0,1 | 3,75 / 4,3 | 7,35 / 14,2 | 31,95 / 33 |
| Chromium | 1 000 | Recherche | 0,1 / 0,1 | 25,8 / 28,4 | 26,55 / 29,1 | 66,8 / 74,9 |
| Chromium | 1 000 | Liste → Courses | 0,3 / 0,3 | 28,9 / 32,2 | 54,3 / 99,2 | 77,55 / 122,6 |
| WebKit | 100 | Recherche | 0 / 0 | 5,5 / 6 | 6 / 7 | 63 / 64 |
| WebKit | 100 | Liste → Courses | 0 / 1 | 9 / 10 | 12 / 14 | 65 / 66 |
| WebKit | 1 000 | Recherche | 0 / 0 | 53,5 / 79 | 54 / 80 | 130,5 / 165 |
| WebKit | 1 000 | Liste → Courses | 0 / 1 | 78 / 101 | 91 / 113 | 163,5 / 199 |

À 1 000 articles, le 95e percentile du regroupement est au plus de 1 ms dans les deux moteurs. Au 95e percentile sur WebKit, le passage à Courses atteint 113 ms jusqu’à la mise à jour du DOM. La phase React atteint 101 ms au même percentile. Les deux percentiles sont calculés sur des séries distinctes. Pour poursuivre l’analyse, profiler le rendu et le montage des lignes de Courses, puis reproduire le scénario sur iPhone physique.

## PANI-36 — Retour visuel au dépôt

Le 22 novembre 2026, sur les builds de production avant et après correction, Playwright a déplacé la première de trois lignes fictives à la dernière position dans Liste et Catégories. La fenêtre était de 390 × 844. Une transaction IndexedDB de test maintenue ouverte retardait la persistance. Le test contrôle l’ordre du DOM et échantillonne la position de la ligne avec `requestAnimationFrame` dès le relâchement du pointeur.

- Avant correction, Chromium et WebKit affichaient encore l’ordre initial pendant la fenêtre de contrôle d’une seconde, dans les deux vues.
- Après correction, les deux moteurs affichent l’ordre demandé pendant le verrou. Sur les huit premières images échantillonnées, la ligne déplacée ne repasse pas par sa position d’origine. Après libération du verrou et confirmation, le nouvel ordre est retrouvé à la relance.

Ce protocole reproduit le retour à l’ancien ordre au dépôt. La cadence pendant le geste, le défilement près des bords et le lien avec le signalement sur iPhone 18 Pro restent à vérifier sur appareil.
