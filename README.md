# DeskFlow

DeskFlow is a React + Vite, Express, MongoDB Atlas support ticket triage board.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Add your MongoDB Atlas URI to `MONGO_URI`.
3. Copy `frontend/.env.example` to `frontend/.env`.
4. Keep `VITE_API_URL=http://localhost:5000` for local development.

## Commands

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

API smoke test:

```bash
cd backend
npm run test:api
```

## Deployment

Render uses `render.yaml`. Set `MONGO_URI` and `CLIENT_ORIGIN` in Render environment variables.

Netlify uses `frontend/netlify.toml`. Set `VITE_API_URL` to the deployed Render backend URL before building.
