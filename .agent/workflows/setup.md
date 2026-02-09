---
description: Setup and run the dashboard
---

1. Ensure you have updated the `DATABASE_URL` in the `.env` file.
// turbo
2. Push the database schema to Neon:
```bash
npx drizzle-kit push
```
// turbo
3. Start the application in development mode:
```bash
npm run dev
```
