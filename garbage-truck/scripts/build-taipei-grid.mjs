import fs from "node:fs";
import path from "node:path";

const API = "https://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=a6e90031-7ec4-4089-afb5-361a4efe7202&limit=10000";
const OUT = path.resolve("garbage-truck/data");
const CITY = "taipei";
const STEP = 0.06;
const ORIGIN_LNG = 121.4;
const ORIGIN_LAT = 24.9;

function num(v) {
  return Number(String(v ?? "").replaceAll(",", "").trim());
}
function timeParts(v) {
  const raw = String(v ?? "").replace(":", "").trim().padStart(4, "0");
  const h = Number(raw.slice(0, 2));
  const m = Number(raw.slice(2, 4));
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
  return { text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, minutes: h * 60 + m };
}
function compact(row) {
  const x = num(row["經度"]);
  const y = num(row["緯度"]);
  const a = timeParts(row["抵達時間"]);
  const d = timeParts(row["離開時間"]);
  const p = String(row["地點"] ?? "").trim();
  if (!p || !Number.isFinite(x) || !Number.isFinite(y) || !a || !d) return null;
  return { p, x, y, a: a.text, d: d.text, am: a.minutes, dm: d.minutes };
}
function tileId(r) {
  const ix = Math.floor((r.x - ORIGIN_LNG) / STEP);
  const iy = Math.floor((r.y - ORIGIN_LAT) / STEP);
  return `${ix}_${iy}`;
}

const response = await fetch(API, { headers: { "user-agent": "study-in-taiwan-garbage-truck-grid/1.0" } });
if (!response.ok) throw new Error(`Taipei API HTTP ${response.status}`);
const payload = await response.json();
const raw = payload?.result?.results ?? payload?.results ?? [];
if (!Array.isArray(raw) || raw.length < 1000) {
  throw new Error(`Unexpected Taipei dataset size: ${Array.isArray(raw) ? raw.length : "not-array"}`);
}

const rows = raw.map(compact).filter(Boolean);
if (rows.length < 1000) throw new Error(`Too few valid rows after normalization: ${rows.length}`);

const tiles = new Map();
for (const row of rows) {
  const id = tileId(row);
  if (!tiles.has(id)) tiles.set(id, []);
  tiles.get(id).push(row);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, CITY), { recursive: true });

const manifest = {
  version: 1,
  city: CITY,
  generated_at: new Date().toISOString(),
  source: "Taipei Open Data garbage-truck pickup-point dataset",
  source_api: API,
  grid_deg: STEP,
  origin: [ORIGIN_LNG, ORIGIN_LAT],
  total_rows: rows.length,
  tiles: []
};

for (const [id, data] of [...tiles.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
  const [ix, iy] = id.split("_").map(Number);
  const west = ORIGIN_LNG + ix * STEP;
  const south = ORIGIN_LAT + iy * STEP;
  const file = `${CITY}/${id}.json`;
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(data));
  manifest.tiles.push({
    id,
    bounds: [
      Number(west.toFixed(5)),
      Number(south.toFixed(5)),
      Number((west + STEP).toFixed(5)),
      Number((south + STEP).toFixed(5))
    ],
    count: data.length,
    file
  });
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Built ${manifest.tiles.length} tiles from ${rows.length} Taipei schedules.`);
