# Projet Supabase

Appliquer la migration au projet Supabase de test avant de renseigner `.env.local` avec son URL HTTPS et sa clé publique. Créer deux utilisateurs de test par e-mail et mot de passe. Pour une instance personnelle, configurer Auth pour réserver la création des comptes à l’administration du projet.

Exécuter `node --env-file=.env.local supabase/tests/storage-access.mjs` avec `PANI_TEST_EMAIL_A`, `PANI_TEST_PASSWORD_A`, `PANI_TEST_EMAIL_B` et `PANI_TEST_PASSWORD_B` définis dans l’environnement. Le script vérifie l’accès du propriétaire, l’isolement du second compte et l’impossibilité d’écraser une sauvegarde. Il crée et supprime un objet de test unique. Conserver les identifiants de test hors Git.

Le client utilise seulement la clé publique. La migration réserve les objets au compte qui possède leur préfixe. Sur un projet existant, vérifier que les autres politiques Storage ne donnent pas accès au bucket `pani-backups`.
