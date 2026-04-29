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
- Gmail-based quote and invoice sending with PDF attachments

## Folder Structure

```text
app/
  api/gmail/*             Gmail OAuth, disconnect, and send routes
  api/logo/route.ts       Logo proxy used by PDF generation
  oauth2callback/route.ts Google OAuth callback route
  dashboard/page.tsx      Protected dashboard route
  schedules/page.tsx      Protected schedule route
  customers/page.tsx      Protected customer route
  items/page.tsx          Protected service item route
  quotes/page.tsx         Protected quote route
  invoices/page.tsx       Protected invoice route
  settings/page.tsx       Protected logo and Gmail settings
components/               App shell, pages, forms, auth provider
lib/                      Firebase, Firestore, PDF, email, formatting helpers
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

# Gmail automatic sending
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://shree-accounts.vercel.app/oauth2callback
GMAIL_OAUTH_STATE_SECRET=use-a-long-random-string
GMAIL_FROM_NAME=Shree Cleaning
GMAIL_FROM_EMAIL=info@shreecleaning.com

# Firebase service account used only by server routes
FIREBASE_SERVICE_ACCOUNT_JSON=...
# Or use these two values instead of FIREBASE_SERVICE_ACCOUNT_JSON:
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=...
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Firebase Setup

1. Create a Firebase project on the free Spark plan.
2. Add a Web App in Firebase project settings.
3. Copy the web app config values into `.env.local`.
4. Enable Authentication providers:
   - Google
   - Email/Password
5. Create a Firestore database.
6. Create a service account key for the server routes:
   - Firebase Console -> Project settings -> Service accounts
   - Click `Generate new private key`
   - Add the full JSON to Vercel as `FIREBASE_SERVICE_ACCOUNT_JSON`, or add `client_email` and `private_key` separately.
7. Publish `firestore.rules` so users can only access their own data, while server-only private Gmail tokens stay hidden from the browser:

```text
users/{userId}/customers/{customerId}
users/{userId}/jobs/{jobId}
users/{userId}/settings/{settingId}
users/{userId}/private/{document=**}  // denied to browser clients
```

With the Firebase CLI, run:

```bash
firebase deploy --only firestore:rules
```

8. Add your local and production domains in Firebase Authentication authorized domains:
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
3. Add all `NEXT_PUBLIC_FIREBASE_*`, Gmail OAuth, and Firebase service account environment variables in Vercel Project Settings.
4. Deploy.
5. Add the deployed Vercel domain to Firebase Authentication authorized domains.

## Gmail Automatic Email Setup

1. In Google Cloud, enable the Gmail API for the project.
2. In Google Auth Platform, add the scopes this app requests:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
3. If the OAuth app is in testing mode, add your Gmail account as a test user.
4. Create a `Web application` OAuth client.
5. Add these OAuth values:
   - Authorized JavaScript origin: `https://shree-accounts.vercel.app`
   - Authorized redirect URI: `https://shree-accounts.vercel.app/oauth2callback`
6. For local testing, also add:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/oauth2callback`
   - Set local `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback`
7. Copy the generated Client ID and Client Secret into Vercel as `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
8. Set `GOOGLE_OAUTH_REDIRECT_URI=https://shree-accounts.vercel.app/oauth2callback` in Vercel.
9. Set `GMAIL_OAUTH_STATE_SECRET` to any long random string.
10. Redeploy the app.
11. Open Settings in the app and click `Connect Gmail`.

Quotes and invoices sent from the app will use Gmail API sending with a PDF copy attached.

## Firestore Data Model

All customer and job records are stored below the authenticated user's UID:

```text
users/{userId}/customers/{customerId}
users/{userId}/jobs/{jobId}
```

This keeps each user's data isolated. The included Firestore rules enforce that isolation on the database.

## Logo Behavior

Quotes and invoices use the company logo saved in Settings. If no uploaded logo is saved, PDFs try the Shree Cleaning website logo and continue gracefully if the logo cannot be loaded.
