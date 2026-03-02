-- worker/schema.sql
DROP TABLE IF EXISTS submissions;
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    protocol TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
