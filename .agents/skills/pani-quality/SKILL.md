---
name: pani-quality
description: Appliquer les contrôles qualité de Pani lors d’un changement de code, d’une revue ou d’une mesure de performance.
---

Lire AGENTS.md, le ticket local et les spécifications concernées. Utiliser docs/conventions.md pour le flux Git et docs/tests.md pour les commandes et scénarios de validation.

Pour une régression, couvrir le comportement par le service ou l’interface qui l’expose. Employer des fixtures fictives et des contextes isolés. Si l’interface change, vérifier son alternative au clavier et relever la recette iPhone restante.

Pour une optimisation, mesurer le parcours sur le build de production. Fixer jeux de données, navigateurs et protocole avant de changer le code. Consigner médiane, 95e percentile et limites d’attribution. Préserver l’ordre et les résultats affichés ainsi que les contrats de persistance.

Rendre compte des contrôles exécutés, des résultats et des vérifications restantes.
