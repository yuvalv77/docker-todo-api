# Docker Todo API

![CI](https://github.com/yuvalv77/docker-todo-api/actions/workflows/ci.yml/badge.svg)

A small Todo list REST API built to demonstrate containerizing a multi-service app with Docker and Docker Compose.

## Architecture

```
┌─────────────┐        ┌─────────────────┐
│  api        │──────▶ │  db             │
│  (Node.js/  │  TCP   │  (PostgreSQL 16) │
│  Express)   │ :5432  │                 │
│  :3000      │        │                 │
└─────────────┘        └─────────────────┘
```

Two containers, defined in `docker-compose.yml`:
- **api** — Express server, built from the local `Dockerfile`
- **db** — official `postgres:16-alpine` image, with a named volume (`pgdata`) so data survives container restarts

The `api` service waits for `db` to report healthy (via `pg_isready`) before starting, and the API also retries its own DB connection on startup as a second layer of resilience.

## Running it

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```bash
docker compose up --build
```

The API is then available at `http://localhost:3000`.

## Endpoints

| Method | Path         | Description          |
|--------|--------------|-----------------------|
| GET    | `/health`    | Health check          |
| GET    | `/metrics`   | Prometheus metrics    |
| GET    | `/todos`     | List all todos        |
| POST   | `/todos`     | Create a todo `{ "title": "..." }` |
| PATCH  | `/todos/:id` | Toggle a todo's `done` state |
| DELETE | `/todos/:id` | Delete a todo         |

## Example usage

```bash
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"Learn Docker"}'
curl http://localhost:3000/todos
```

## Stopping

```bash
docker compose down       # stop containers, keep data
docker compose down -v    # stop containers and delete data volume
```

## Also deployable to Kubernetes

This same app is also deployed via Kubernetes manifests (2 API replicas, self-healing, persistent storage) — see [`k8s/`](./k8s) for the full setup and image published to [Docker Hub](https://hub.docker.com/r/yuvalnet/docker-todo-api).

## Monitoring

Prometheus + Grafana are wired up alongside the API — see [`monitoring/`](./monitoring) for a live dashboard covering request rate, latency, and error rate.
