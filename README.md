# Edu Application

A small course and homework app for a Cloud/DevOps take-home assessment. It gives the infrastructure a real workload without adding authentication or a large set of business features.

## What the app does

- Lists courses and lets you add a course.
- Lists homework and lets you add a title, description, due date and optional course.
- Shows summary counts, refresh controls and request feedback.
- Provides a health endpoint that checks the database connection.

There is no login, access control, editing or deletion, file upload, payment flow or exam system. Use demo data only.

## Stack and layout

| Directory | Purpose |
| --- | --- |
| `frontend/` | React and Vite UI; Nginx serves the Docker build |
| `backend/` | Express API using the PostgreSQL `pg` connection pool |
| `database/init.sql` | Initial course and homework tables |
| `.github/workflows/ci.yml` | Backend test, frontend build and Docker build checks |

The root package uses npm workspaces. Run the commands below from the repository root unless noted otherwise.

## Run locally without Docker

You need Node.js and npm, plus a running PostgreSQL server. CI and the Dockerfiles use Node 20; use a release compatible with the Vite version in `frontend/package.json`.

### 1. Configure the environment

For a fresh checkout, copy the examples. If you already have `.env` files, keep them and check their values instead.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set the backend values for your local database:

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

The current backend example has `PORT=5051`. Change it to `5050` in your local `.env` to match these instructions and the frontend example.

The frontend needs only the API base URL:

```env
VITE_API_URL=http://localhost:5050
```

Do not append `/api`: the frontend adds it when requesting courses and homework. Never put database credentials in the frontend environment. Values prefixed with `VITE_` are included in the browser bundle and are not secrets.

### 2. Create the database

Use a local PostgreSQL role that can create databases. Replace `your_local_postgres_user` in these commands with that role; do not assume a role named `postgres` exists on your machine.

```bash
createdb -h localhost -p 5432 -U your_local_postgres_user edu_dev
```

This creates the separate `edu_dev` database on the existing PostgreSQL server. Skip it if that database already exists. It does not start PostgreSQL or create a separate server instance.

```bash
psql -h localhost -p 5432 -U your_local_postgres_user -d edu_dev -f database/init.sql
```

This creates the tables. The backend also checks and creates its schema on startup, but it cannot create the database itself. The initialization SQL is not a versioned migration system.

### 3. Install and start

```bash
npm ci
npm start --workspace backend
```

Keep the backend terminal open. In another terminal at the repository root:

```bash
npm run dev --workspace frontend -- --host localhost --port 5173 --strictPort
```

Use these separate commands rather than the root `npm run dev`: that script calls a backend `dev` script which is not currently defined.

| Service | Local address |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5050 |
| Database | `localhost:5432`, database `edu_dev` |

### 4. Check the connection

```bash
curl -i http://localhost:5050/health
curl -i http://localhost:5050/api/courses
curl -i http://localhost:5050/api/homework
```

A healthy API returns `{"status":"ok"}`. An empty list is returned as `[]`, which is normal before any records have been added. Add a course and homework in the browser, then refresh to check that they persist.

If these requests work but the UI cannot load data, check `VITE_API_URL`, the backend port and `CORS_ORIGIN`. Restart the affected process after changing its environment. A database connection refusal means the PostgreSQL server or port needs checking; rerunning the table SQL will not start the server.

## Run with Docker Compose

The repository includes Dockerfiles and a local three-service Compose setup. Docker must be running. This setup uses a PostgreSQL container, not AWS RDS.

The frontend uses a multi-stage build and copies the static bundle and Nginx configuration into the runtime image. Start the local stack with:

```bash
docker compose --env-file backend/.env up --build -d
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs --tail=100 backend
```

Use the backend `.env` prepared above for the database name, user and password. Compose overrides the backend database host to `db` and its database port to `5432`. Stop any native frontend/backend processes first, because Compose uses the same host ports.

| Service | Host port | Container port |
| --- | --- | --- |
| Frontend | `5173` | `80` |
| Backend | `5050` | `5050` |
| PostgreSQL | `5433` | `5432` |

Compose sets the frontend API URL to `http://localhost:5050` at build time. Its database is stored in the `postgres_data` volume, and the initialization script runs when that volume is first initialized.

```bash
docker compose --env-file backend/.env down
```

This stops and removes the containers while keeping the database volume. Adding `--volumes` deletes that database data; do not use it unless you intend to reset the local demo.

## Tests and build checks

After installing dependencies and configuring the backend environment:

```bash
npm test --workspace backend
npm run lint --workspace frontend
npm run build --workspace frontend
```

The backend currently has one health-response test. It mocks the database query, so a passing test does not prove a real database connection or cover course/homework writes. The frontend build checks compilation; it is not an end-to-end browser test.

The [CI workflow](.github/workflows/ci.yml) runs on pushes and pull requests to `main`. It prepares a PostgreSQL service and schema for the backend job, runs the backend test, builds the frontend, then builds both Docker images.

For this assessment, the production frontend and backend images were also built and pushed to AWS ECR and deployed to the EC2 host. Automatic deployment from GitHub Actions is not enabled; the cloud deployment was performed manually after the CI checks passed.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` or `/api/health` | Check API and database connectivity |
| GET / POST | `/api/courses` | List or add courses |
| GET / POST | `/api/homework` | List or add homework |

Requests and responses use JSON. These endpoints have no authentication and are intended for assessment data only.

## AWS infrastructure

The companion `edu-infrastructure` repository owns Terraform, AWS networking, EC2, RDS, ECR, IAM and monitoring resources. Keep infrastructure deployment and cleanup instructions there; this repository owns the application, container definitions and CI checks.

The local Compose file is not used for the AWS deployment. In AWS, the frontend and backend run as separate Docker containers on the EC2 instance and share the `edu-net` Docker network. Nginx serves the frontend on port `80` and proxies `/api/` and `/health` to `backend:5050`.

The backend connects to the private RDS PostgreSQL instance. Database credentials are retrieved from AWS Secrets Manager at deployment time rather than stored in the image or repository. The cloud deployment enables PostgreSQL TLS with `DB_SSL=true`.

## Screenshots / Evidence

No sanitized evidence screenshots are included in this checkout yet. Useful application evidence would show a course and homework saved in the UI, still visible after refresh, plus successful API health output. Use the GitHub Actions run for the same commit to demonstrate the test and build results.

Infrastructure screenshots belong in the infrastructure README. Before sharing any capture, remove credentials, passwords, personal email addresses, AWS account IDs and sensitive terminal or browser details. Do not use application artwork as proof of a working deployment.
