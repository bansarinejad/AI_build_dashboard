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

Switch Prisma to `postgresql`, set `DATABASE_URL`, run migrations, deploy (e.g., Vercel + Neon).

