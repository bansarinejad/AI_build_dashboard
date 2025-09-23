# Data Visualisation Dashboard

A Next.js app to upload an Excel file and visualise **Inventory (end of day)**, **Procurement Amount**, and **Sales Amount** across consecutive days per product.

## Stack
- Next.js (App Router, TS)
- Prisma + SQLite (dev) / Postgres (deploy)
- Excel parsing with `xlsx`
- ECharts for charts
- Auth: bcrypt + JWT (HttpOnly cookie)

## Run locally
```bash
npm install
npx prisma migrate dev
npm run dev
```

Visit:

* `/login` -> register/login
* `/upload` -> upload Excel
* `/dashboard` -> select products & view charts

## Notes

* Parser validates required columns and warns about data issues.
* Upload returns warnings + negative inventory details.
* Dashboard supports product search and CSV export.

## Deploy

The repo ships with a container-based Render blueprint (`render.yaml`) and `Dockerfile`:

1. Install the [Render CLI](https://render.com/docs/blueprint-spec) and authenticate.
2. Provision the stack (web app + free Postgres) straight from the blueprint:
   ```bash
   render blueprint deploy
   ```
3. When the build finishes, Render will launch the service with `npx prisma migrate deploy && npm run start`, so migrations run before Next.js boots.
4. Verify the generated environment variables:
   - `DATABASE_PROVIDER=postgresql`
   - `DATABASE_URL` (injected automatically from the managed Postgres instance)
   - `JWT_SECRET` (auto-generated; rotate if desired)
   - `JWT_EXPIRES_IN=7d`

To deploy on another platform, reuse the Dockerfile or run `npm run build`, `npx prisma migrate deploy`, then `npm run start` against any PostgreSQL database.

