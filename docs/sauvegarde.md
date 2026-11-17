# Sauvegarde et chiffrement

## Flux

L’export de fichier fonctionne sans compte. Activer le cloud dans les réglages requiert une session Supabase et une phrase de récupération choisie et confirmée par l’utilisateur. La phrase déverrouille la sauvegarde côté navigateur et reste en mémoire pour la session active. L’app explique que le compte ne permet pas de retrouver une phrase perdue.

1. Lire articles et catégories dans une transaction cohérente avec la révision locale.
2. Produire une enveloppe versionnée contenant les paramètres de chiffrement publics et le contenu chiffré. À valider dans PANI-11, Web Crypto AES-GCM 256 bits, IV aléatoire de 96 bits par chiffrement et clé dérivée par PBKDF2-SHA-256 avec sel aléatoire d’au moins 128 bits. Mesurer et fixer un coût minimal et maximal sur iPhone. Authentifier l’en-tête canonique comme données associées et contrôler les bornes de taille et de coût avant toute dérivation.
3. Exporter le fichier ou envoyer uniquement l’enveloppe dans un bucket privé Supabase Storage. Les chemins utilisent le préfixe de l’identifiant Auth et un identifiant d’instantané opaque. Réserver lecture, création et suppression au propriétaire via des politiques Storage. La clé privilégiée reste hors du client. Aucune liste, phrase ou clé dans les journaux. Les métadonnées de transport telles que taille et date restent visibles au fournisseur.

## Déclenchement et reprise

Après une modification locale, programmer l’envoi au premier plan avec temporisation. Réessayer à la reprise, au retour du réseau, au rétablissement de la session ou sur demande. Afficher « En attente », « Déverrouiller », « Envoi », « Sauvegardé » ou un échec avec action de reprise. Une révision n’est marquée sauvegardée qu’après confirmation distante. Les changements plus récents gardent l’état en attente. Un nouvel essai conserve l’identifiant et les octets de l’enveloppe préparée tant qu’elle est disponible. Après un conflit dû à un envoi ambigu, vérifier l’objet avant d’annoncer un succès.

Limiter la concurrence entre onglets d’une même installation. Conserver des instantanés immuables distincts entre appareils. La rétention proposée conserve les cinq derniers instantanés par installation et intervient après confirmation d’un nouvel envoi. Une erreur de nettoyage ne remet pas en cause le dernier succès. L’exécution en arrière-plan ou lorsque l’app est fermée reste hors du contrat V1.

## Restauration

Lire une version prise en charge, déchiffrer, migrer le format si nécessaire, valider puis afficher date et compteurs. Une phrase incorrecte, un format inconnu ou une intégrité invalide laisse la base intacte. Si des données locales existent, proposer un export avant le remplacement. Confirmer le remplacement, vérifier que la révision examinée est toujours courante et remplacer atomiquement dans Dexie. En cas d’échec, conserver l’état antérieur. Demander une action explicite avant tout nouvel envoi automatique après restauration.

Les données IndexedDB restent locales en clair dans la V1. Le chiffrement protège les copies de sauvegarde. Il ne protège pas contre une compromission du navigateur ou de l’origine de l’app.
