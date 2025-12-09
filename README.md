# TimeTrack - Smart Time Tracking

A privacy-first time tracking application built with React Router 7, Mantine UI, and PostgreSQL.

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 6

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
createdb timetrack
```

3. Update `.env` with your database credentials and other settings

4. Push database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

6. In another terminal, start worker:
```bash
npm run worker
```

## Deployment (Heroku)

1. Create Heroku app:
```bash
heroku create your-app-name
```

2. Add add-ons:
```bash
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0
```

3. Set config vars:
```bash
heroku config:set R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx ...
```

4. Deploy:
```bash
git push heroku main
```

## Project Structure

```
timetrack-app/
├── app/
│   ├── routes/          # Route components
│   ├── lib/             # Server utilities
│   ├── db/              # Database schema
│   └── components/      # React components
├── worker/              # Background jobs
├── drizzle/             # Database migrations
└── Procfile             # Heroku deployment
```

## Tech Stack

- **Frontend**: React Router 7, Mantine UI
- **Backend**: Node.js, PostgreSQL, Redis
- **Storage**: Cloudflare R2
- **Queue**: BullMQ
- **ORM**: Drizzle
- **Deployment**: Heroku

## License

MIT
