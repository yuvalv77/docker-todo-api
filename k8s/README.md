# Kubernetes Deployment

This is the same Todo API from the repo root, deployed to Kubernetes instead of Docker Compose — same application, different orchestration.

## Why this exists alongside `docker-compose.yml`

Docker Compose runs everything on a single machine. Kubernetes adds:
- **Self-healing** — if a Pod dies, the Deployment controller replaces it automatically
- **Scaling** — the API runs as 2 replicas behind a single Service; either can fail without downtime
- **Declarative state** — every resource is defined in YAML and applied with `kubectl apply`, not built up with imperative commands

## Architecture

```
Namespace: todo-app
┌─────────────────────────────────────────────┐
│  Deployment: api (2 replicas)                │
│  ┌────────┐   ┌────────┐                     │
│  │ api Pod│   │ api Pod│  ← Service: api      │
│  └────────┘   └────────┘     (ClusterIP:3000) │
│       │             │                         │
│       └──────┬──────┘                         │
│              ▼                                │
│  Deployment: db (1 replica)                   │
│  ┌────────┐                                   │
│  │ db  Pod│  ← Service: db (ClusterIP:5432)   │
│  └────────┘                                   │
│       │                                       │
│       ▼                                       │
│  PersistentVolumeClaim: postgres-pvc          │
└─────────────────────────────────────────────┘
```

## Files

| File | Resource | Purpose |
|---|---|---|
| `00-namespace.yaml` | Namespace | Isolates everything under `todo-app` |
| `01-secrets.yaml` | Secret | DB password + connection string |
| `02-postgres-pvc.yaml` | PersistentVolumeClaim | Durable storage for Postgres data |
| `03-postgres-deployment.yaml` | Deployment | Runs the Postgres container |
| `04-postgres-service.yaml` | Service | Stable internal address (`db`) for the API to reach Postgres |
| `05-api-deployment.yaml` | Deployment | Runs 2 replicas of the API, pulled from Docker Hub |
| `06-api-service.yaml` | Service | Stable internal address (`api`) for reaching the API |

## Running it

Requires a local Kubernetes cluster (this was built and tested against Docker Desktop's built-in Kubernetes).

```bash
kubectl apply -f k8s/
kubectl get pods -n todo-app
```

The API image is pulled from Docker Hub (`yuvalnet/docker-todo-api`), so no local build step is required — the manifests work on any machine with `kubectl` access to a cluster.

Access the API locally (Services are internal-only by default):

```bash
kubectl port-forward -n todo-app svc/api 3000:3000
curl http://localhost:3000/health
```

## Self-healing demo

```bash
kubectl delete pod -n todo-app <any-api-pod-name>
kubectl get pods -n todo-app -w
```

A replacement Pod is created automatically within seconds — the Deployment controller continuously reconciles the running state against the desired `replicas: 2`.

## Tearing down

```bash
kubectl delete namespace todo-app
```

(Deletes every resource created above in one command, since they're all scoped to the `todo-app` namespace.)
