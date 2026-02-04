# Development Setup & Quick Start

---

## **Prerequisites**

- **Node.js** 18+ (verify: `node --version`)
- **npm** 9+ (verify: `npm --version`)
- **Git** (verify: `git --version`)
- **PostgreSQL** 14+ (for backend, optional for frontend-only work)
- **Docker** (optional, for running database in container)

---

## **Frontend-Only Setup (5 minutes)**

### **1. Clone & Install**

```bash
cd ~/dev/trajectory
npm install

# Optional: Install VS Code extensions
# - ESLint
# - TypeScript Vue Plugin
# - CSS Modules
```

### **2. Start Development Server**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in browser

**Expected output:**
```
  VITE v5.4.21  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### **3. Verify Setup**

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Both should complete without errors
```

---

## **Full Stack Setup (15 minutes)**

### **1. Backend Setup**

```bash
cd backend
npm install
```

### **2. Database Setup**

**Option A: Docker (Recommended)**

```bash
# Start PostgreSQL in Docker
docker run --name trajectory-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=trajectory \
  -e POSTGRES_DB=trajectory \
  -p 5432:5432 \
  postgres:15

# In another terminal, run migrations
cd backend
npm run migrate
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb trajectory

# Set environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/trajectory"

# Run migrations
cd backend
npm run migrate
```

### **3. Start Backend**

```bash
cd backend
npm run dev
```

**Expected output:**
```
✓ Server listening on 0.0.0.0:3000
  Health check: http://0.0.0.0:3000/health
  API base URL: http://0.0.0.0:3000/api
```

### **4. Start Frontend (in new terminal)**

```bash
cd frontend
npm run dev
```

---

## **Common Commands**

### **Frontend**

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests (if configured)
```

### **Backend**

```bash
npm run dev      # Start server
npm run build    # TypeScript compilation
npm run start    # Run compiled server
npm run migrate  # Run database migrations
```

### **Type Checking**

```bash
# Frontend
cd frontend && npx tsc --noEmit

# Backend
cd backend && npm run build
```

---

## **Project Structure**

```
trajectory/
├── frontend/
│   ├── src/
│   │   ├── app/              # App shell, layout
│   │   ├── components/       # Shared components
│   │   ├── features/         # Feature modules
│   │   │   ├── visits/
│   │   │   ├── children/
│   │   │   ├── medical/
│   │   │   └── ...
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   ├── shared/           # Shared types, utils, styles
│   │   └── pages/            # Page components
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── app.ts            # Express app
│   │   ├── index.ts          # Server entry
│   │   ├── db/               # Database
│   │   ├── lib/              # Utilities
│   │   ├── routers/          # API routes
│   │   ├── features/         # Feature modules
│   │   └── types/            # TypeScript types
│   ├── migrations/           # Database migrations
│   ├── package.json
│   └── tsconfig.json
│
└── vibe/                      # Documentation & planning
    ├── FRONTEND_IMPROVEMENT_PLAN.md
    ├── PRIORITY_*.md         # Completed priorities
    └── ...
```

---

## **Environment Variables**

### **Frontend** (.env.local)

```
VITE_API_BASE_URL=http://localhost:3000/api
```

### **Backend** (.env)

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://trajectory:password@localhost:5432/trajectory
LOG_LEVEL=debug
```

---

## **Troubleshooting**

### **Port Already in Use**

```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### **Database Connection Failed**

```bash
# Check PostgreSQL is running
psql -U trajectory -d trajectory -c "SELECT NOW();"

# If using Docker
docker ps | grep postgres

# If not running, start it
docker start trajectory-db
```

### **TypeScript Errors**

```bash
# Try reinstalling node_modules
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

### **Module Not Found**

```bash
# Verify import path is correct
# Common issues:
# - Missing @ alias (check tsconfig.json)
# - File doesn't exist or wrong extension
# - Case sensitivity (Mac doesn't care, Linux does)
```

---

## **IDE Setup (VS Code)**

### **Extensions**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

Install with: `code --install-extension <extension-id>`

### **Settings** (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### **Debug Configuration** (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## **Git Workflow**

### **Before Starting Work**

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature
```

### **While Working**

```bash
# Make changes
# Commit frequently:
git add .
git commit -m "feat: description of change"

# Push to GitHub
git push origin feature/my-feature
```

### **Before Pushing**

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# If both pass, safe to push
git push origin feature/my-feature
```

### **Create Pull Request**

1. Go to GitHub
2. Click "New Pull Request"
3. Select your branch
4. Add description
5. Click "Create Pull Request"

---

## **Performance Tips**

### **Vite Development**

- First build is slow (caches dependencies)
- Subsequent builds are fast
- HMR (Hot Module Reload) updates should be < 100ms

### **Type Checking**

- Run `tsc --noEmit` before pushing
- IDE usually catches errors in real-time
- Build will fail if TypeScript errors exist

### **Build Size**

Current bundle size:
```
JS: 938 KB (262 KB gzipped)
CSS: 195 KB (29 KB gzipped)
```

Monitoring:
```bash
npm run build
# Check dist/ folder sizes
```

---

## **Common Tasks**

### **Add a New Page**

1. Create file: `src/pages/MyPage.tsx`
2. Add route in `src/app.tsx` or appropriate router
3. Create corresponding module: `src/pages/MyPage.module.css`
4. Export from `src/pages/index.ts`

### **Add a New Component**

1. Create folder: `src/components/MyComponent/`
2. Add files:
   - `MyComponent.tsx`
   - `MyComponent.module.css`
   - `index.ts` (export)
3. Type props interface properly
4. Add JSDoc comment

### **Add a New Hook**

1. Create file: `src/hooks/useMyHook.ts`
2. Export from `src/hooks/index.ts`
3. Add JSDoc with params and return type
4. Example usage in tests/docs

### **Create API Client**

Frontend API client is in `src/shared/lib/api-client.ts`:

```typescript
// Usage:
const response = await visitsApi.getAll();
const data = response.data;
```

Backend routes are in `backend/src/routers/`:

```typescript
// Add new endpoint:
router.get('/api/visits', (req, res) => {
  // Handler
});
```

---

## **Testing Your Changes**

### **Manual Testing Checklist**

- [ ] Form validation works
- [ ] Data saves successfully
- [ ] UI updates after save
- [ ] Error messages appear on failure
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Dark mode works
- [ ] Accessibility (Tab key navigation)

### **Before Committing**

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Manual test in dev server
npm run dev

# If all good:
git commit -m "feature description"
```

---

## **Resources**

- **[Vite Docs](https://vitejs.dev/)** - Build tool
- **[React Docs](https://react.dev/)** - UI library
- **[TypeScript Docs](https://www.typescriptlang.org/docs/)** - Type safety
- **[React Router Docs](https://reactrouter.com/)** - Routing
- **[Express Docs](https://expressjs.com/)** - Backend framework
- **[PostgreSQL Docs](https://www.postgresql.org/docs/)** - Database

---

## **Getting Help**

1. **Check Docs** - Start with COMPONENT_PATTERNS.md, TESTING_GUIDE.md
2. **Search Code** - Look for similar patterns in codebase
3. **Read Comments** - JSDoc comments explain complex functions
4. **Ask Team** - Slack, Discord, or team standup
5. **Create Issue** - Document problem and steps to reproduce

---

## **Quick Reference**

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npx tsc --noEmit` |
| Install dependencies | `npm install` |
| Update dependencies | `npm update` |
| Clear cache | `npm cache clean --force` |
| View git log | `git log --oneline` |
| Stash changes | `git stash` |
| Reset to main | `git reset --hard origin/main` |

---

**Welcome to Trajectory! Happy coding! 🚀**
