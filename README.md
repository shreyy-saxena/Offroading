Offroading — see `offroading-prd.md` for the product spec and `.scratch/offroading/` for the implementation ticket breakdown.

This is a [Next.js](https://nextjs.org) project, deployed on Vercel, backed by Supabase (Postgres, Auth, Storage).

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project's values (Settings > API in the Supabase dashboard):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server-only. Bypasses Row Level Security; never expose to the browser or commit it.
- `LOCATIONIQ_API_KEY`, `RESEND_API_KEY` — wired up in later tickets (06, 09); declared now so the full env surface is documented in one place.

## Database migrations

Schema lives in `supabase/migrations/` (Supabase CLI, added as a dev dependency — run via `pnpm exec supabase <command>`). To apply migrations to this project's live Supabase instance for the first time:

```bash
pnpm exec supabase login                              # opens a browser to create a CLI access token
pnpm exec supabase link --project-ref yjivffybeylsboikfbpz   # prompts for the project's DB password (Settings > Database)
pnpm exec supabase db push
```

Both the login token and DB password are credentials only the project owner holds — an agent can write migration files but can't push them without you running this once. After linking, `supabase db push` picks up any new migration file automatically.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
