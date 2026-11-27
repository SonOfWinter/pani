# ADR-002 — Composants et interactions

**Statut** — Retenu.

Construire l’identité Soft Native sur fond noir avec texte blanc et accent bordeaux avec Tailwind CSS v4 et des tokens. Personnaliser les primitives shadcn/ui et construire les interactions propres à Liste et Courses. Confier le déplacement à dnd-kit, prévoir des commandes accessibles équivalentes et vérifier la coexistence avec le swipe et le défilement sur iPhone. Le menu de la ligne fournit une commande « Ajouter aux courses » accessible au clavier.

La flèche d’annulation du bandeau est commune aux trois vues. Chaque vue conserve en mémoire au plus cinq inverses d’opérations métier validées. Les services relisent les données concernées et appliquent l’inverse dans une transaction Dexie. Le cycle de vie de cet historique suit la session d’interface et une restauration réussie le réinitialise. Les schémas IndexedDB et de sauvegarde gardent leur format.

Le bandeau supérieur reste ancré pendant le défilement. Son emplacement réserve la hauteur du bandeau développé pour garder la position de lecture lors de la transition. Le bandeau de mise à jour partage cet emplacement et suit les actions lorsque le titre se compacte.

Dans Liste et Catégories, l’interface affiche le nouvel ordre dès le dépôt et conserve cet aperçu jusqu’à la lecture de la révision validée. Le calcul des positions est partagé avec les services, qui relisent les données dans la transaction Dexie. En cas d’échec, l’aperçu est retiré et l’interface reflète les données locales.

Le glisser-déposer suit l’axe vertical dans Liste et Catégories. Dans Liste, la détection de cible projette le pointeur sur cet axe et conserve les rayons comme destinations.

Au survol d’un rayon ouvert, les lignes de destination se décalent pour prévisualiser l’insertion. Un déplacement validé rejoint l’historique de sa vue. Son inverse rétablit seulement les positions et les catégories concernées dans Dexie, après vérification des emplacements.

Les animations de coche et de décoche gardent brièvement l’ancien état à l’écran pendant que la commande s’écrit dans Dexie. Le retour d’annulation s’appuie sur les positions visibles avant l’action et sur l’ordre local relu après son exécution. Les mouvements réduits désactivent ces transitions.
