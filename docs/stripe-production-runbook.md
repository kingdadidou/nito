# Exploitation Stripe en production — NITO

## Séparation stricte des environnements

- Vercel `Production` utilise uniquement `sk_live_…` et les secrets `whsec_…` des destinations Stripe Live.
- Vercel `Preview` et le poste local utilisent uniquement les clés de test.
- Ne jamais copier une réservation, un PaymentIntent ou un compte Connect d'un environnement vers l'autre.
- Après toute modification de variable Vercel, redéployer la production et vérifier un webhook signé.

Variables de production attendues :

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` pour les événements du compte plateforme
- `STRIPE_CONNECT_WEBHOOK_SECRET` pour les événements des comptes connectés
- `NEXT_PUBLIC_SITE_URL=https://www.nito-nature.fr`

## Destinations webhook

URL unique : `https://www.nito-nature.fr/api/stripe/webhook`.

Destination « Votre compte » : Checkout, échecs de paiement, remboursements, litiges et Stripe Identity.

Destination « Comptes connectés » : `account.updated` et événements `payout.*`. Les deux destinations possèdent des secrets de signature différents ; l'application accepte les deux.

Surveiller les événements dans **Administration → Finances**. Toute livraison en échec doit être analysée et renvoyée depuis Stripe après correction.

## Remboursements et annulations

NITO utilise des destination charges. Un remboursement complet est créé avec `reverse_transfer=true` et `refund_application_fee=true` : le transfert vers l'organisateur est repris et la commission est remboursée proportionnellement.

Procédure :

1. vérifier l'identité du demandeur, la réservation et la politique d'annulation applicable ;
2. saisir un motif précis dans **Administration → Réservations** ;
3. contrôler le statut du remboursement dans **Administration → Finances** et dans Stripe ;
4. en cas d'échec, ne pas relancer aveuglément : examiner le solde de la plateforme et du compte connecté ;
5. informer le participant du délai bancaire réel.

## Litiges et soldes négatifs

Avec les destination charges, la plateforme supporte les frais Stripe, remboursements et litiges. Politique NITO :

- traiter tout `charge.dispute.created` le jour ouvré de sa réception ;
- suspendre temporairement le reversement lié si le dossier le justifie ;
- conserver dans Stripe les preuves de réservation, échanges, annulation et exécution de la sortie ;
- ne jamais téléverser une pièce d'identité dans l'administration NITO ;
- maintenir une réserve Stripe suffisante pour les remboursements et litiges ;
- examiner quotidiennement les soldes négatifs et rapprocher chaque mouvement avec la réservation concernée ;
- ne reprendre les fonds d'un organisateur qu'après vérification contractuelle et comptable ;
- documenter la décision et l'échéance de réponse dans le dossier du litige.

Une réserve initiale doit être décidée avec l'expert-comptable à partir du volume, du délai moyen d'annulation et du taux de litige. NITO ne doit pas lancer commercialement les paiements sans responsable opérationnel désigné pour cette surveillance.

## Recette avant ouverture

En mode test : paiement accepté, paiement refusé, expiration de Checkout, annulation avant paiement, remboursement complet, événement webhook dupliqué et webhook renvoyé après erreur.

En mode Live, après accord explicite du dirigeant :

1. créer une sortie privée ou à visibilité limitée au prix minimal accepté ;
2. effectuer un paiement réel avec une carte appartenant au testeur autorisé ;
3. vérifier la réservation, la commission, le transfert et les emails ;
4. annuler et rembourser intégralement ;
5. vérifier le retour des fonds et le rapprochement Stripe/Supabase.

Ne pas tenter de provoquer un refus bancaire réel. Les scénarios d'échec se valident en mode test avec les moyens de paiement de test Stripe.

## Contrôle quotidien et mensuel

Quotidien : webhooks en échec, litiges ouverts, remboursements en attente, comptes Connect désactivés et reversements échoués.

Mensuel : rapprochement volume/commissions/remboursements/virements, revue des accès Stripe et Vercel, rotation des secrets si nécessaire et export comptable.
