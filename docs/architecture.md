# Architecture

## Composants

- **Interface** — React et TypeScript avec Vite. Tailwind CSS v4, composants shadcn/ui personnalisés pour formulaires, menus et panneaux, Lucide React pour les icônes. Lignes, navigation segmentée et swipe propres à Pani. dnd-kit pour le déplacement tactile et clavier.
- **Domaine** — validation, opérations Liste/Courses, ordre et règles de suppression. Aucune dépendance à React ni au réseau. Les commandes modifiant plusieurs enregistrements passent par une transaction.
- **Persistance** — Dexie sur IndexedDB est la source de vérité. Les écrans observent les requêtes locales. Les imports et migrations valident les invariants dans les transactions appropriées.
- **PWA** — manifeste, icônes et service worker via vite-plugin-pwa. Précacher le shell et ses ressources versionnées. Ne pas mettre en cache Auth, Storage ou des réponses utilisateur. Appliquer une mise à jour à un moment explicite, après les écritures ou la saisie en cours.
- **Sauvegarde** — lire un instantané cohérent dans une transaction, puis sérialiser et chiffrer dans le navigateur. L’adaptateur cloud assure l’accès à Supabase Auth et Storage. Les écritures de liste restent indépendantes de la sauvegarde.
- **Hébergement** — site statique sur Vercel via HTTPS. Utiliser une origine HTTPS stable en production, car IndexedDB et le cache sont liés à l’origine. Garder les environnements de test séparés.

## Défaillances

Si IndexedDB refuse une écriture ou atteint son quota, signaler l’échec et conserver la dernière version validée. Ne pas réinitialiser la base sur une erreur d’ouverture. Après perte de stockage ou changement d’origine, proposer une restauration. Sur iPhone, valider la relance sans réseau dans Safari et dans la PWA installée. Les vérifications de versions et de compatibilité de la stack auront lieu dans PANI-01 et PANI-10.
