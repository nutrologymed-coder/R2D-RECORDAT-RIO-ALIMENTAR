import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock API for local development
  app.post("/api/submit", (req, res) => {
    const accessKey = req.headers['x-access-key'];
    if (accessKey !== 'R2D-SECRET-2024') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const protocol = `R2D-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log('Submission received:', req.body.patient.name);
    res.json({ ok: true, protocol });
  });

  app.get("/api/entry", (req, res) => {
    res.json({ error: 'Not implemented in mock' });
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
