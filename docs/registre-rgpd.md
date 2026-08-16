# Registre des activités de traitement — NITO

Version de travail du 16 août 2026. Responsable de traitement : Fabien Bruno Emile LEBRUN, entrepreneur individuel NITO, contact : support@nito-nature.fr.

Ce registre doit être revu au moins une fois par an et à chaque ajout de fonctionnalité, prestataire ou catégorie de données.

| Traitement | Personnes et données | Finalité / base | Destinataires et prestataires | Conservation de référence | Sécurité principale |
| --- | --- | --- | --- | --- | --- |
| Comptes et profils | Participants et organisateurs : identité, e-mail, photo, biographie, ville, rôle | Création et sécurisation du compte / contrat | NITO, Supabase, Resend pour les e-mails | Compte actif ; suppression opérationnelle à la demande, puis archivage des seules données légalement nécessaires | Supabase Auth, RLS, contrôle par rôle |
| Organisateurs et vérifications | Identité, statut, compétences, affiliation, assurance, diplômes et état Stripe | Sécurité des sorties, vérification des conditions d’activité / contrat, obligations légales, intérêt légitime | Personnel NITO habilité, Supabase, Stripe | Documents jusqu’à expiration ou fin de la relation, puis suppression ; éléments nécessaires à un litige au plus 5 ans | Buckets privés, liens signés temporaires, journal d’administration |
| Sorties et réservations | Annonce, localisation approximative, rendez-vous exact, participants, réservation | Publier et exécuter la sortie / contrat | Organisateur, participants confirmés, Supabase | Annonce pendant sa publication ; réservation et preuve contractuelle pendant 5 ans, pièces comptables pendant 10 ans | RLS, point exact limité aux personnes autorisées |
| Paiements et reversements | Montant, identifiants Stripe, statut du paiement et remboursement | Encaissement, commission, remboursement, comptabilité / contrat et obligation légale | Stripe, NITO, organisateur concerné | Identifiants opérationnels pendant la relation ; pièces comptables 10 ans | Clés secrètes côté serveur, webhooks signés, aucun numéro de carte stocké par NITO |
| Messagerie et pièces jointes | Messages, expéditeur, destinataires, sortie, fichiers, dates de lecture | Communication et sécurité / contrat et intérêt légitime | Membres de la conversation, modérateurs habilités, Supabase | Compte actif ; suppression ou archivage limité, au plus 5 ans lorsqu’un litige le justifie | RLS, stockage privé, liens temporaires, blocage et signalement |
| Avis et modération | Note, commentaire, auteur, destinataire, signalements, décisions | Confiance, prévention des abus et modération / contrat et intérêt légitime | Utilisateurs concernés, modérateurs NITO | Publication et durée utile du compte ; preuves de modération au plus 5 ans | Avis réservé aux sorties réalisées, journal des décisions |
| Support et notifications | E-mail, contenu de la demande, notifications et historique d’envoi | Assistance et information de service / contrat et intérêt légitime | NITO, Resend, Supabase | Durée de traitement puis archivage maximal de 5 ans si nécessaire à une réclamation | Accès restreint, minimisation des contenus envoyés par e-mail |
| Mesure d’audience et journaux | Pages consultées agrégées, journaux techniques, adresse IP selon le prestataire | Mesure d’audience, sécurité et prévention des abus / intérêt légitime | Vercel et prestataires techniques | Statistiques agrégées selon la configuration ; journaux techniques 12 mois maximum sauf incident | Pas de profilage publicitaire, accès technique restreint |

## Droits et demandes

Les demandes d’accès, rectification, effacement, limitation, opposition et portabilité sont reçues à support@nito-nature.fr. Elles sont enregistrées, vérifiées et traitées en principe sous un mois. Toute conservation après suppression d’un compte doit être justifiée par une obligation légale, la prévention de la fraude ou un contentieux identifié.

## Points à documenter avant ouverture payante

- contrats de sous-traitance et garanties de transfert hors EEE de Supabase, Vercel, Stripe et Resend ;
- configuration exacte des durées de journaux chez chaque prestataire ;
- procédure interne de violation de données et registre des incidents ;
- analyse de la nécessité d’une AIPD si les traitements ou risques évoluent ;
- date, responsable et résultat de chaque revue annuelle du registre.
