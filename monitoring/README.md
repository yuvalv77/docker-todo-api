# Monitoring (Prometheus + Grafana)

Adds observability to the same Todo API — not just "is it running", but "how is it performing right now."

## How it works

```
┌────────┐   scrapes /metrics every 5s   ┌────────────┐   queries   ┌─────────┐
│  api   │ ─────────────────────────────▶│ Prometheus │────────────▶│ Grafana │
└────────┘                                └────────────┘             └─────────┘
```

1. The API exposes a `/metrics` endpoint (via `prom-client`) with request counts, request duration, and default Node.js process metrics (memory, CPU, event loop).
2. Prometheus scrapes that endpoint every 5 seconds and stores the time series.
3. Grafana queries Prometheus and renders it as a dashboard — provisioned automatically, no manual clicking required.

## Running it

```bash
docker compose up --build -d
```

- API metrics (raw): `http://localhost:3000/metrics`
- Prometheus UI: `http://localhost:9090`
- Grafana dashboard: `http://localhost:3001/d/todo-api-overview/todo-api` (login: `admin` / `admin`, or browse anonymously as a Viewer)

Generate some traffic to see the graphs move:

```bash
for i in $(seq 1 20); do curl -s http://localhost:3000/todos > /dev/null; done
```

## Dashboard panels

| Panel | What it shows |
|---|---|
| Request rate (req/s) | How much traffic the API is handling right now |
| p95 latency | The response time 95% of requests are faster than — a much more honest number than an average |
| Total requests | Running total since the API started |
| Requests by status code | Whether traffic is mostly succeeding (2xx) or failing (4xx/5xx) |
| Process memory | Whether the Node process is leaking memory over time |

## Why this matters

Without this, "is the app healthy?" means SSHing in and guessing. With it, the answer is a graph — the same principle behind real production monitoring, just scaled down to a single API.
