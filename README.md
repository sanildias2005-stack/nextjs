# Premium React Admin Dashboard

A professional React dashboard built with Next.js, Drizzle ORM, and NextAuth. It features a secure role-based access control system with admin approval.

## Features
- **Modern Auth**: Sign up and Login with secure password hashing.
- **Admin Approval**: New users are 'PENDING' until an admin approves them.
- **Role-based Access**: Separate dashboards for Admins and regular Users.
- **Live Database**: Powered by Neon (PostgreSQL).
- **Glassmorphic UI**: High-end aesthetics with dark mode.

## Setup Instructions

### 1. Database Setup (Neon)
1. Go to [Neon.tech](https://neon.tech) and create a free project.
2. Copy your **Connection String** (PostgreSQL URL).
3. Open the `.env` file in the root directory.
4. Replace `DATABASE_URL` with your actual Neon connection string.

### 2. Push Schema to Database
Run the following command to create the tables in your Neon DB:
```bash
npx drizzle-kit push
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Admin Setup
- The **first user** to sign up will automatically be granted the `admin` role and `APPROVED` status.
- Subsequent users will be `user` role and `PENDING` status.
- Admins can log in and visit the **Admin Panel** to approve/reject users.

## Deployment to Vercel
1. Push this code to a GitHub repository.
2. Connect the repository to [Vercel](https://vercel.com).
3. Add your Environment Variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) in the Vercel dashboard.
4. Deploy!
