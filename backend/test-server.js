// ---------------------------------------------
// 🗳️ Hamlet Election Platform Backend
// Auto-imports candidate CSV on startup
// ---------------------------------------------

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import readline from "readline";

// ✅ Auto-import helper
async function importCandidates() {
  try {
    const DATA_PATH = path.join(process.cwd(), "data", "MASTER_CANDIDATES_7769.csv");

    if (!fs.existsSync(DATA_PATH)) {
      console.log("⚠️ Candidate file not found at", DATA_PATH);
      return [];
    }

    const rl = readline.createInterface({
      input: fs.createReadStream(DATA_PATH, "utf8"),
      crlfDelay: Infinity,
    });

    const candidates = [];
    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      if (lineNumber === 1 || !line.trim()) continue; // skip header

      // Split safely and handle missing columns
      const cols = line.split(",").map((c) => c.trim());
      const [
        ListID = "",
        Party = "",
        Number = "",
        Type = "",
        Governorate = "",
        Gender = "",
        FullName = "",
        Code = "",
      ] = cols;

      candidates.push({
        id: Code || String(lineNumber),
        list_id: ListID,
        party: Party,
        number: Number,
        type: Type,
        governorate: Governorate,
        gender: Gender,
        full_name: FullName,
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
// Express + CORS setup
// ---------------------------------------------
const app = express();

const allowedOrigins = [
  "https://amlet-unified.vercel.app",
  "https://test-new-frontend.vercel.app",
  "https://amlet-unified-absulysulys-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(",").map((o) => o.trim()));
}

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : (console.log(`CORS blocked origin: ${origin}`), cb(null, true)),
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------
// API endpoints
// ---------------------------------------------
let candidates = [];

// Root route
app.get("/", (_, res) =>
  res.json({ message: "🗳️ Hamlet Backend is running perfectly." })
);

// Health route
app.get("/health", (_, res) =>
  res.json({ status: "ok", total_candidates: candidates.length })
);

// Stats route
app.get("/api/stats", (_, res) =>
  res.json({ totalCandidates: candidates.length })
);

// Paginated + filterable candidates list
app.get("/api/candidates", (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1"), 1);
  const limit = Math.max(parseInt(req.query.limit || "20"), 1);
  const { governorate, gender, party } = req.query;

  let filtered = candidates;
  if (governorate) filtered = filtered.filter((c) => c.governorate === governorate);
  if (gender) filtered = filtered.filter((c) => c.gender === gender);
  if (party) filtered = filtered.filter((c) => c.party === party);

  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({ data, total: filtered.length, page, limit });
});

// Single candidate
app.get("/api/candidates/:id", (req, res) => {
  const c = candidates.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
});

// ---------------------------------------------
// Startup: import + listen
// ---------------------------------------------
const PORT = Number(process.env.PORT || 4001);

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  candidates = await importCandidates();
  console.log(`📊 API ready → ${candidates.length} candidates loaded`);
});

export default app;
