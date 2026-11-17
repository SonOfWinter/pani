# ADR-003 — Instantanés chiffrés

**Statut** — Retenu pour l’architecture. Paramètres du format à valider dans PANI-11.

Chiffrer les instantanés dans le navigateur et stocker les enveloppes dans un fichier ou dans Supabase Storage privé avec Supabase Auth. Une restauration explicite remplace les données locales après validation. Auth contrôle l’accès au fichier et la phrase permet son déchiffrement. L’appareil reste utilisable pendant les pannes réseau. La récupération dépend d’une copie valide et de la phrase.
