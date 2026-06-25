# MeetMind AI

A production-ready SaaS starter for AI meeting intelligence.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Shadcn-style UI primitives
- NextAuth with email, Google, and Microsoft
- PostgreSQL with Prisma
- Google Calendar and Microsoft Outlook sync
- OpenAI meeting summaries

## Setup

1. Copy `.env.example` to `.env` and fill in provider credentials.
2. Install dependencies with `npm install`.
3. Create the database and run `npm run prisma:migrate`.
4. Start the app with `npm run dev`.

## OAuth callback URLs

- Google/Microsoft auth: `http://localhost:3000/api/auth/callback/google` and `/microsoft-entra-id`
- Calendar connection callbacks: `http://localhost:3000/api/calendar/google/callback` and `/api/calendar/microsoft/callback`

Production deployments should use HTTPS, encrypted secrets, provider app verification, and a durable background job runner for calendar sync.
