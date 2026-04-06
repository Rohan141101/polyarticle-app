# PolyArticle

## Frontend Setup

```bash
npm install
expo start
```

### Build APK (local)
```bash
npx expo run:android --variant release
```

### Build via EAS (recommended for store)
```bash
# Preview APK
eas build --platform android --profile preview

# Production AAB (Play Store)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env values
npm run dev       # development
npm run build && npm start   # production
```

### Required .env values
- `DATABASE_URL` — PostgreSQL connection string
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `ADMIN_SECRET` — Secret for admin endpoints
