# ADR-004 — Contrôles qualité au commit, au push et en CI

**Statut** — Retenu.

## Contexte

PANI-01 et PANI-16 ont établi les vérifications en CI. Les lancer aux étapes locales où elles donnent un retour rapide permet de détecter les erreurs avant le dépôt d’une branche.

## Décision

Husky installe les hooks au moment de `npm ci`. Le commit vérifie le lint du code indexé en lecture seule. Un fichier de code partiellement indexé bloque le commit, puisque le linter lit le répertoire de travail. Le push vérifie le typage et exécute Vitest.

GitHub Actions exécute le lint complet, le typage, Vitest, le build et Playwright sur Chromium et WebKit à partir du contenu soumis. L’installation des hooks est désactivée en CI.

## Conséquences

Les commits évitent le coût du build et des navigateurs. La CI vérifie l’état soumis même si le répertoire de travail local contenait des modifications. Les vérifications de Safari sur iPhone et du cloud restent décrites dans la [stratégie de tests](../tests.md).
