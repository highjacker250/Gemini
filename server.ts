import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("app.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT,
    text TEXT,
    timestamp INTEGER,
    mode TEXT,
    groundingUrls TEXT,
    image TEXT,
    video TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/messages/:mode", (req, res) => {
    const { mode } = req.params;
    const messages = db.prepare("SELECT * FROM messages WHERE mode = ? ORDER BY timestamp ASC").all(mode);
    res.json(messages.map((m: any) => ({
      ...m,
      groundingUrls: m.groundingUrls ? JSON.parse(m.groundingUrls) : []
    })));
  });

  app.post("/api/messages", (req, res) => {
    const { id, role, text, timestamp, mode, groundingUrls, image, video } = req.body;
    const stmt = db.prepare(`
      INSERT INTO messages (id, role, text, timestamp, mode, groundingUrls, image, video)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, role, text, timestamp, mode, JSON.stringify(groundingUrls || []), image || null, video || null);
    res.status(201).json({ status: "ok" });
  });

  app.delete("/api/messages/:mode", (req, res) => {
    const { mode } = req.params;
    db.prepare("DELETE FROM messages WHERE mode = ?").run(mode);
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
