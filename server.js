const express = require("express");
const { Pool } = require("pg");
const client = require("prom-client");

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2]
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"]
});
register.registerMetric(httpRequestsTotal);

app.use((req, res, next) => {
  const endTimer = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    endTimer(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDb(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          done BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      console.log("Connected to database and ensured todos table exists.");
      return;
    } catch (err) {
      console.log(`DB not ready yet (attempt ${attempt}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Could not connect to database after multiple retries.");
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/todos", async (req, res) => {
  const result = await pool.query("SELECT * FROM todos ORDER BY id");
  res.json(result.rows);
});

app.post("/todos", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  const result = await pool.query(
    "INSERT INTO todos (title) VALUES ($1) RETURNING *",
    [title.trim()]
  );
  res.status(201).json(result.rows[0]);
});

app.patch("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    "UPDATE todos SET done = NOT done WHERE id = $1 RETURNING *",
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "todo not found" });
  }
  res.json(result.rows[0]);
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Todo API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
