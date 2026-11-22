# ADR-002 — Composants et interactions

**Statut** — Retenu.

Construire l’identité Soft Native sur fond noir avec texte blanc et accent bordeaux avec Tailwind CSS v4 et des tokens. Personnaliser les primitives shadcn/ui et construire les interactions propres à Liste et Courses. Confier le déplacement à dnd-kit, prévoir des commandes accessibles équivalentes et vérifier la coexistence avec le swipe et le défilement sur iPhone. Le menu de la ligne fournit une commande « Ajouter aux courses » accessible au clavier.

La flèche d’annulation du bandeau est commune aux trois vues. Chaque vue conserve en mémoire au plus cinq inverses d’opérations métier validées. Les services relisent les données concernées et appliquent l’inverse dans une transaction Dexie. Le cycle de vie de cet historique suit la session d’interface et une restauration réussie le réinitialise. Les schémas IndexedDB et de sauvegarde gardent leur format.
