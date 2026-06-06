const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
const dbPath = path.join(dbDir, 'sihterica.sqlite');

let db = null;

async function initDatabase() {
  if (db) return db;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // --- Users ---
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('voditelj', 'racunovodstvo', 'admin')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- Workers ---
  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      hourly_rate REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add hourly_rate column if missing (existing DBs)
  try {
    db.run('SELECT hourly_rate FROM workers LIMIT 1');
  } catch {
    try { db.run('ALTER TABLE workers ADD COLUMN hourly_rate REAL DEFAULT 0'); } catch { }
  }

  // --- Locations ---
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- Work Logs ---
  db.run(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      location_id INTEGER,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('RAD', 'GO', 'BO', 'SLO')),
      hours REAL DEFAULT 0,
      description TEXT DEFAULT '',
      submitted INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (worker_id) REFERENCES workers(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(worker_id, date, location_id)
    )
  `);

  // --- Day Locks (new) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS day_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      locked_by INTEGER,
      locked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (worker_id) REFERENCES workers(id),
      FOREIGN KEY (locked_by) REFERENCES users(id),
      UNIQUE(worker_id, date)
    )
  `);

  // --- Settings (key/value) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default settings if missing
  const settingDefaults = {
    gablec_rate: '6.5',
    gablec_min_hours: '5'
  };
  for (const [key, value] of Object.entries(settingDefaults)) {
    const exists = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
    if (!exists) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  // --- Machines ---
  db.run(`
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- Machine Logs ---
  db.run(`
    CREATE TABLE IF NOT EXISTS machine_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      hours REAL DEFAULT 0,
      description TEXT DEFAULT '',
      blocked INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (machine_id) REFERENCES machines(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Migration: add blocked column if missing (existing DBs)
  try {
    db.run('SELECT blocked FROM machine_logs LIMIT 1');
  } catch {
    try { db.run('ALTER TABLE machine_logs ADD COLUMN blocked INTEGER DEFAULT 0'); } catch { }
  }

  // --- Trucks (new) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS trucks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // --- Truck Logs (new) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS truck_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      km REAL DEFAULT 0,
      description TEXT DEFAULT '',
      blocked INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (truck_id) REFERENCES trucks(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_work_logs_worker ON work_logs(worker_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_work_logs_location ON work_logs(location_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_machine_logs_date ON machine_logs(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_day_locks_worker_date ON day_locks(worker_id, date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_truck_logs_date ON truck_logs(date)');

  saveDatabase();
  console.log('📦 Baza podataka inicijalizirana');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDb() {
  if (!db) throw new Error('Baza podataka nije inicijalizirana.');
  return db;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  const changes = queryOne('SELECT changes() as changes');
  saveDatabase();
  return { lastInsertRowid: lastId?.id, changes: changes?.changes };
}

module.exports = { initDatabase, getDb, queryAll, queryOne, runSql, saveDatabase };
