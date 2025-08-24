# Student Dashboard with Google OAuth (Node.js + Express)

This project integrates your custom login template with Google OAuth. Students can log in with their Google account and the app will show their latest Gmail emails.

## Setup
1. Go to Google Cloud Console → Create project → Enable Gmail API.
2. Configure OAuth consent screen (add test users).
3. Create OAuth client ID (Web) → redirect URI: `http://localhost:3000/oauth2callback`.
4. Copy `.env.example` to `.env` and fill CLIENT_ID and CLIENT_SECRET.
5. Run:
```bash
cd server
npm install
npm run dev
```
6. Open http://localhost:3000 → "Login with Google".

## Deploy
Deploy `server/` to your hosting (Render, Railway, etc.) and set env vars.

## Routes
- `/login` → starts Google OAuth
- `/oauth2callback` → callback
- `/dashboard.html` → student dashboard
- `/api/me` → user info
- `/api/emails` → recent emails
- `/logout` → log out
