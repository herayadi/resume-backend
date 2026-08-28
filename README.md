# Regina Resume Backend

Next.js App Router API, Supabase data layer, and authenticated Admin CMS for Regina Septianadrah's resume.

## Features

- Aggregated public resume API with ordered nested projects.
- Validated and rate-limited contact form storage.
- Supabase Auth admin allowlist.
- CRUD for profile, social links, skills, education, experiences, projects, and contact inbox.
- Avatar and PDF uploads through a public Supabase Storage bucket.
- Read-only Laravel SQLite exporter and idempotent Supabase seed.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill every value.
3. Apply `supabase/migrations/20260828000000_create_resume_schema.sql` in the Supabase SQL Editor.
4. Create the admin user in Supabase Auth and include its email in `ADMIN_EMAILS`.
5. Run `npm run export:laravel` while the old Laravel repository is available beside `migration-workspace`, or set `LARAVEL_SQLITE_PATH` to its SQLite file.
6. Run `npm run verify:export` and `npm run seed:resume`.
7. Run `npm run dev`, then open `/admin`.

The seed uses stable Laravel IDs and upserts records. It never mass-deletes database content.

## API

| Method | Route | Access |
|---|---|---|
| GET | `/api/health` | Public |
| GET | `/api/v1/resume` | Public |
| POST | `/api/v1/contact` | Public, 5 requests/hour per IP and email |
| GET/PUT | `/api/admin/profile` | Admin |
| GET/POST | `/api/admin/{resource}` | Admin |
| GET/PUT/DELETE | `/api/admin/{resource}/{id}` | Admin |
| POST | `/api/admin/upload` | Admin |

Admin resources are `social-links`, `skills`, `education`, `experiences`, `projects`, and `contact-messages`. Contact messages are read/delete only.

## Deployment

Deploy to Vercel and set all variables from `.env.example`. Set `FRONTEND_URL` to the exact Cloudflare Pages/custom-domain origin without a trailing slash. The public resume response uses `Cache-Control: no-store`, so admin changes are visible without cache invalidation.
