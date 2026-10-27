# ChainSight — Supply Chain Analytics Platform

A role-based supply chain analytics dashboard built with Next.js 16, React 19, Tailwind CSS, and Supabase.

## Roles

- **Manager** — full dashboard with analytics, inventory, shipments, procurement, suppliers, and employee request approvals
- **Employee** — task management, limited inventory/shipment views, and requisition submission

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | manager@chainsight.demo | Manager123! |
| Employee | employee@chainsight.demo | Employee123! |

## Getting started

```bash
# 1. Copy env template and fill in your Supabase project values
cp .env.example .env.local

# 2. Install dependencies
pnpm install

# 3. Run the dev server
pnpm dev
```

## Environment variables

See `.env.example` for required variables.

## Database

SQL migrations are in `supabase/migrations/`. Run them against your Supabase project to set up the schema. The app falls back to local mock data when Supabase is not configured.

## Tech stack

- [Next.js 16](https://nextjs.org)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Supabase](https://supabase.com)
- [Recharts](https://recharts.org)
- [shadcn/ui](https://ui.shadcn.com)
