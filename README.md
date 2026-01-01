
Sports Ladder

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


The project works with supabase and inngest.

Make sure to add the following env vars before running the server:


```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
FROM_EMAIL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
PUBLIC_SITE_URL=
```

Start inngest local server with
```bash
npx --ignore-scripts=false inngest-cli@latest dev
```

Stages:
1. CHALLENGED - before challenge is accepted
2. PENDING - before match result is uploaded
3. PROCESSING - before result is verified
4. COMPLETED - before rating is updated
5. PROCESSED - all stages complete