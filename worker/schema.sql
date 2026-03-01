-- Migration SQL for Cloudflare D1
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  start_date TEXT NOT NULL,
  notes TEXT,
  payload_json TEXT NOT NULL,   -- recordatório completo (itens dos 2 dias)
  totals_json TEXT NOT NULL,    -- totais e médias calculados
  flags_json TEXT NOT NULL      -- avisos de estimativa/fallback
);

CREATE INDEX IF NOT EXISTS idx_protocol ON entries(protocol);
