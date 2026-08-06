# NITO

Plateforme de sorties nature construite avec Next.js, Supabase et Stripe Connect.

## Développement local

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Ouvrir `http://localhost:3000`.

## Configuration requise

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

La clé Supabase `service_role` et les secrets Stripe ne doivent jamais être placés dans une variable `NEXT_PUBLIC_*`.

## Architecture

- `app/` : pages publiques et espaces participant, organisateur et administrateur
- `components/` : composants partagés
- `app/api/` : routes serveur sécurisées
- `lib/supabase/` : clients Supabase SSR et administrateur
- `lib/stripe/` : client Stripe côté serveur
- `supabase/migrations/` : schéma PostgreSQL, fonctions, déclencheurs et politiques RLS

## Données

Toutes les sorties, activités, réservations, évaluations, statistiques et entrées de calendrier affichées par l’application proviennent de Supabase. Le prototype historique fondé sur `localStorage` et ses données fictives ont été retirés.

## Vérifications

```bash
npm run build
npm run lint
```

Production : `https://www.nito-nature.fr`.
