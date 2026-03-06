const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/day-locks — voditelj locks a worker+date
router.post('/', authMiddleware, (req, res) => {
    const { worker_id, date } = req.body;

    if (!worker_id || !date) {
        return res.status(400).json({ error: 'worker_id i date su obavezni' });
    }

    // Check if already locked
    const existing = queryOne(
        'SELECT * FROM day_locks WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]
    );
    if (existing) {
        return res.status(400).json({ error: 'Dan je već zaključan' });
    }

    // Must have at least one entry to lock
    const entries = queryOne(
        'SELECT COUNT(*) as cnt FROM work_logs WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]
    );
    if (!entries || entries.cnt === 0) {
        return res.status(400).json({ error: 'Nema unosa za zaključati' });
    }

    const result = runSql(
        'INSERT INTO day_locks (worker_id, date, locked_by) VALUES (?, ?, ?)',
        [parseInt(worker_id), date, req.user.id]
    );

    const lock = queryOne('SELECT * FROM day_locks WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(lock);
});

// POST /api/day-locks/lock-all — lock all workers with entries for a date
router.post('/lock-all', authMiddleware, (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ error: 'date je obavezan' });
    }

    // Find workers with entries on this date who aren't locked
    const workers = queryAll(`
    SELECT DISTINCT wl.worker_id 
    FROM work_logs wl
    WHERE wl.date = ?
    AND wl.worker_id NOT IN (SELECT worker_id FROM day_locks WHERE date = ?)
  `, [date, date]);

    let locked = 0;
    for (const w of workers) {
        runSql(
            'INSERT INTO day_locks (worker_id, date, locked_by) VALUES (?, ?, ?)',
            [w.worker_id, date, req.user.id]
        );
        locked++;
    }

    res.json({ message: `Zaključano ${locked} radnika za ${date}` });
});

// DELETE /api/day-locks — računovodstvo unlocks a worker+date
router.delete('/', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { worker_id, date } = req.body;

    if (!worker_id || !date) {
        return res.status(400).json({ error: 'worker_id i date su obavezni' });
    }

    const lock = queryOne(
        'SELECT * FROM day_locks WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]
    );
    if (!lock) {
        return res.status(404).json({ error: 'Zaključavanje nije pronađeno' });
    }

    runSql('DELETE FROM day_locks WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]);

    res.json({ message: 'Dan je otključan' });
});

// GET /api/day-locks — get locks for a month
router.get('/', authMiddleware, (req, res) => {
    const { month, year, date } = req.query;

    if (date) {
        const locks = queryAll('SELECT * FROM day_locks WHERE date = ?', [date]);
        return res.json(locks);
    }

    if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const locks = queryAll('SELECT * FROM day_locks WHERE date LIKE ?', [`${year}-${monthStr}%`]);
        return res.json(locks);
    }

    res.json([]);
});

module.exports = router;
