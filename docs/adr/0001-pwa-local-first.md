# ADR-001 — PWA et données locales

**Statut** — Retenu.

L’usage principal a lieu sur iPhone, y compris dans les zones sans réseau. Vite sert une PWA React/TypeScript statique, déployée sur Vercel. Une base IndexedDB gérée par Dexie porte l’état métier et le service worker permet la relance hors ligne après chargement initial. Il faut conserver l’origine de production, tester les migrations et documenter la récupération après effacement du stockage.
