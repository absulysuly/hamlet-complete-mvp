// ---------------------------------------------
// 🗳️ Hamlet Election Platform Backend (Stable)
// Auto-imports MASTER_CANDIDATES_7769.csv on startup
// ---------------------------------------------

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

// ✅ Proper CSV Import Helper
async function importCandidates() {
  try {
    const DATA_PATH = path.join(process.cwd(), "data", "MASTER_CANDIDATES_7769.csv");

    if (!fs.existsSync(DATA_PATH)) {
      console.log("⚠️ Candidate file not found at", DATA_PATH);
      return [];
    }

    const fileContent = fs.readFileSync(DATA_PATH, "utf8");

    const candidates = [];
    const parser = parse(fileContent, {
      columns: true,           // use the header row
      skip_empty_lines: true,
      trim: true,
    });

    for await (const row of parser) {
      // Match your headers exactly:
      const { ElectionNumber, Name_English, Name_Original, City } = row;

      candidates.push({
        id: ElectionNumber || String(candidates.length + 1),
        election_number: ElectionNumber,
        name_english: Name_English,
        name_original: Name_Original,
        city: City,
      });
    }

    console.log(`✅ ${candidates.length.toLocaleString()} candidates imported successfully`);
    return candidates;
  } catch (err) {
    console.error("❌ Import failed:", err);
    return [];
  }
}

// ---------------------------------------------
// Express Setup
// ---------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

let candidates = [];

// Root Route
app.get("/", (_, res) => {
  res.json({ message: "🗳️ Hamlet Backend is alive and parsing CSVs like a champ." });
});

// Health Check
app.get("/health", (_, res) => {
  res.json({ status: "ok", total_candidates: candidates.length });
});

// Stats
app.get("/api/stats", (_, res) => {
  res.json({ totalCandidates: candidates.length });
});

// Paginated Candidates List
app.get("/api/candidates", (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1"), 1);
  const limit = Math.max(parseInt(req.query.limit || "20"), 1);

  const start = (page - 1) * limit;
  const end = start + limit;
  const data = candidates.slice(start, end);

  res.json({ data, total: candidates.length, page, limit });
});

// Single Candidate
app.get("/api/candidates/:id", (req, res) => {
  const c = candidates.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
});

// ---------------------------------------------
// Startup
// ---------------------------------------------
const PORT = Number(process.env.PORT || 4001);

const startServer = async () => {
  candidates = await importCandidates();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`📊 API ready → ${candidates.length} records loaded`);
  });
};

startServer();
