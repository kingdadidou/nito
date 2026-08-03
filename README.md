# NaturEnsemble

> Version 0.2 : migration du prototype vers Next.js, Supabase et Stripe.

## Démarrage Next.js

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Ouvrir `http://localhost:3000`. Sans variables Supabase/Stripe, l'interface reste consultable en mode démonstration ; les écritures serveur signalent explicitement que le service concerné n'est pas configuré.

## Nouvelle architecture

- `app/` : pages publiques et espaces utilisateur, organisateur et administrateur
- `components/` : composants d'interface partagés
- `app/api/` : routes serveur pour les sorties, Stripe Checkout et le webhook
- `lib/supabase/` : client Supabase SSR utilisant des cookies
- `supabase/migrations/` : schéma PostgreSQL et politiques RLS
- `index.html`, `app.js`, `styles.css` : prototype historique conservé comme référence

Prototype front-end complet d'une plateforme de mise en relation entre passionnés de nature et débutants.

## Fonctions intégrées
- Accueil immersif
- Recherche et filtres
- Carte illustrative
- Fiches détaillées
- Favoris
- Réservation simulée
- Création de sorties
- Messagerie
- Calendrier et export ICS
- Profils et avis
- Notifications
- Sécurité et signalement
- Administration et modération
- Stockage local des données avec localStorage
- Design responsive mobile / tablette / ordinateur

## Lancement
Ouvrir simplement `index.html` dans un navigateur récent.

Pour éviter certaines restrictions locales du navigateur, il est aussi possible de lancer :
```bash
python -m http.server 8000
```
puis d'ouvrir `http://localhost:8000`.

## Limites du prototype
Les paiements, l'authentification, la géolocalisation cartographique réelle, les notifications push et la base de données sont simulés. Pour une mise en production, prévoir une API sécurisée, PostgreSQL, un service d'authentification, Stripe Connect, un fournisseur cartographique et un hébergement.
