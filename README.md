# Edu Local Application

Small local three-tier application for the DevOps handoff.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL via `pg` connection pool

## Local runtime

| Service | URL / port |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5050 |
| Health | http://localhost:5050/health |
| PostgreSQL | localhost:5432 |
| Database | `edu_dev` |

Ports `3000`, `4000`, and `5433` are intentionally not used.

## Required tools

- Node.js 20 or newer
- npm
- PostgreSQL running locally and listening on port `5432`

## Environment variables

Copy the examples to `.env` files and replace the placeholders. Never commit `.env` files.

Backend: `backend/.env.example`

```env
NODE_ENV=development
PORT=5050
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edu_dev
DB_USER=your_local_postgres_user
DB_PASSWORD=your_local_postgres_password
CORS_ORIGIN=http://localhost:5173
```

Frontend: `frontend/.env.example`

```env
VITE_API_URL=http://localhost:5050
```

## Database initialization

Create the isolated `edu_dev` database, then run [`database/init.sql`](database/init.sql) with your local PostgreSQL credentials.

The backend also creates the required tables on startup if they do not exist.

## Install and run

Backend:

```bash
cd backend
npm install
npm start
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev -- --host localhost --port 5173
```

## Tests and build

```bash
cd backend
npm test

cd ../frontend
npm run build
```

## Application scope

- View courses
- Add course
- View homework
- Add homework
- `GET /health`

No authentication, payments, uploads, notifications, exams, grading, Firebase, or complex permissions are included.

## API endpoints

- `GET /health`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/homework`
- `POST /api/homework`

## DevOps handoff

Application services are frontend, backend, and PostgreSQL. The DevOps engineer owns the delivery checks, environment configuration, cloud infrastructure, CI/CD, IAM, secrets, monitoring, and production routing.

Required backend variables: `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

Required frontend variable: `VITE_API_URL`.

No Docker commands are part of this application handoff.

## DevOps execution order

1. Run backend tests and the frontend production build locally.
2. Run the same checks in GitHub Actions on every push and pull request.
3. Store production variables in the hosting platform's secret manager; never put them in Git.
4. Provision the production database and application runtime through Terraform after the cloud target is selected.
5. Deploy the backend and frontend, then verify `/health`, database connectivity, and the browser flow.
