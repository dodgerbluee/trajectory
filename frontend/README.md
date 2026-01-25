# Frontend

React app (Vite, TypeScript). Growth charts (Recharts), visit/illness forms, avatars, file attachments, light/dark theme.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript + Vite build → `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint on `.ts` / `.tsx` |

## Local dev

1. Backend and DB must be running (e.g. `./start.sh` or `npm run dev` in backend with DB up).
2. `npm run dev`. Default dev server uses Vite proxy for `/api` → backend.

Build-time env: `VITE_API_URL`. Empty for relative API calls (proxy); set to backend base URL if needed.
