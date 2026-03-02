import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("data.db");

// Initialize local database
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    start_date TEXT NOT NULL,
    notes TEXT,
    payload_json TEXT NOT NULL,
    totals_json TEXT NOT NULL,
    flags_json TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API for local development and AI Studio Preview
  app.post("/api/submit", (req, res) => {
    const accessKey = req.headers['x-access-key'];
    // Accept both the default and a potentially configured key
    if (accessKey !== 'R2D-SECRET-2024' && accessKey !== process.env.ACCESS_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const data = req.body;
      const protocol = `R2D-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const stmt = db.prepare(`
        INSERT INTO entries (protocol, created_at, patient_name, patient_phone, start_date, notes, payload_json, totals_json, flags_json) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        protocol,
        new Date().toISOString(),
        data.patient.name,
        data.patient.phone,
        data.patient.startDate,
        data.patient.notes || "",
        JSON.stringify(data.days),
        JSON.stringify(data.summary),
        JSON.stringify(data.summary.day1.warnings.concat(data.summary.day2.warnings))
      );

      console.log(`Recordatório salvo com sucesso: ${protocol} para ${data.patient.name}`);
      res.json({ ok: true, protocol, message: "Salvo localmente no servidor de desenvolvimento." });
    } catch (err: any) {
      console.error('Erro ao salvar:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/entry", (req, res) => {
    const protocol = req.query.protocol as string;
    if (!protocol) return res.status(400).json({ error: "Missing protocol" });

    const entry = db.prepare("SELECT * FROM entries WHERE protocol = ?").get(protocol);
    if (!entry) return res.status(404).json({ error: "Not found" });

    res.json(entry);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
