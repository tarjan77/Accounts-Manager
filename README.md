# Shree Cleaning Manager

A Vercel-ready Next.js application for small cleaning businesses to manage customers, bookings, invoices, and internal payment tracking with Firebase Authentication and Firestore.

## Tech Stack

- Frontend: Next.js App Router, React, Tailwind CSS
- Backend: Firebase Authentication and Firestore
- PDF invoices: jsPDF
- Hosting: Vercel free tier compatible
- Payments: internal status tracking only, no payment gateway

## Current Features

- Schedule-first job board with list and calendar views
- Dashboard quick-add job flow
- Customer directory with structured WA address fields
- Cleaning service builder for end of lease, deep cleaning, windows, pressure cleaning, and extras
- Multi-line PDF invoices with quantity, unit price, and amount columns

## Folder Structure

```text
app/
  api/logo/route.ts       Logo proxy used by invoice PDF generation
  dashboard/page.tsx      Protected dashboard route
  customers/page.tsx      Protected customer CRUD route
  jobs/page.tsx           Protected job, schedule, payment, invoice route
  export/page.tsx         Protected CSV export route
  login/page.tsx          Google and email/password sign-in
components/               App shell, pages, forms, auth provider
lib/                      Firebase, Firestore, invoice, CSV, formatting helpers
firestore.rules           UID-isolated Firestore security rules
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_SHREE_LOGO_URL=https://www.shreecleaning.com/logo.png
```

## Firebase Setup

1. Create a Firebase project on the free Spark plan.
2. Add a Web App in Firebase project settings.
3. Copy the web app config values into `.env.local`.
4. Enable Authentication providers:
   - Google
   - Email/Password
5. Create a Firestore database.
6. Publish `firestore.rules` so users can only access their own data:

```text
users/{userId}/customers/{customerId}
users/{userId}/jobs/{jobId}
```

With the Firebase CLI, run:

```bash
firebase deploy --only firestore:rules
```

7. Add your local and production domains in Firebase Authentication authorized domains:
   - `localhost`
   - your Vercel domain

## Run Locally

```bash
npm install
npm run dev
```

You can also use `pnpm install` and `pnpm dev`; the included lockfile was generated with pnpm.

Open `http://localhost:3000`.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel Project Settings.
4. Deploy.
5. Add the deployed Vercel domain to Firebase Authentication authorized domains.

## Firestore Data Model

All customer and job records are stored below the authenticated user's UID:

```text
users/{userId}/customers/{customerId}
users/{userId}/jobs/{jobId}
```

This keeps each user's data isolated. The included Firestore rules enforce that isolation on the database.

## Invoice Logo Behavior

Invoices try to load `https://www.shreecleaning.com/logo.png` through the included Next.js logo route and embed it in the downloaded PDF. If the logo cannot load, invoice generation continues without crashing. A fallback logo can be uploaded from the dashboard and is stored locally in the browser for future invoice downloads on that device.
