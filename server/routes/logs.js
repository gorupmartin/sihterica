const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/logs — list logs with filters
router.get('/', authMiddleware, (req, res) => {
    const { date, worker_id, month, year } = req.query;

    let query = `
    SELECT wl.*, 
           w.name as worker_name, w.surname as worker_surname,
           l.name as location_name
    FROM work_logs wl
    JOIN workers w ON wl.worker_id = w.id
    LEFT JOIN locations l ON wl.location_id = l.id
    WHERE 1=1
  `;
    const params = [];

    if (date) {
        query += ' AND wl.date = ?';
        params.push(date);
    }
    if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        query += ' AND wl.date LIKE ?';
        params.push(`${year}-${monthStr}%`);
    }
    if (worker_id) {
        query += ' AND wl.worker_id = ?';
        params.push(parseInt(worker_id));
    }

    query += ' ORDER BY w.surname, w.name, l.name';

    const logs = queryAll(query, params);
    res.json(logs);
});

// GET /api/logs/worker-day — all entries + lock status for a worker on a date
router.get('/worker-day', authMiddleware, (req, res) => {
    const { worker_id, date } = req.query;
    if (!worker_id || !date) {
        return res.status(400).json({ error: 'worker_id i date su obavezni' });
    }

    const logs = queryAll(`
    SELECT wl.*, l.name as location_name
    FROM work_logs wl
    LEFT JOIN locations l ON wl.location_id = l.id
    WHERE wl.worker_id = ? AND wl.date = ?
    ORDER BY l.name
  `, [parseInt(worker_id), date]);

    const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);

    const lock = queryOne(
        'SELECT * FROM day_locks WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]
    );

    res.json({ logs, totalHours, locked: !!lock });
});

// GET /api/logs/matrix — calendar grid with lock info
router.get('/matrix', authMiddleware, (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) {
        return res.status(400).json({ error: 'Mjesec i godina su obavezni' });
    }

    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}%`;

    // All workers (active + blocked with hours this month)
    const workers = queryAll(`
    SELECT DISTINCT w.id, w.name, w.surname, w.active
    FROM workers w
    LEFT JOIN work_logs wl ON w.id = wl.worker_id AND wl.date LIKE ?
    WHERE w.active = 1 OR wl.id IS NOT NULL
    ORDER BY w.surname, w.name
  `, [datePrefix]);

    // All logs for the month
    const logs = queryAll(`
    SELECT wl.*, l.name as location_name
    FROM work_logs wl
    LEFT JOIN locations l ON wl.location_id = l.id
    WHERE wl.date LIKE ?
    ORDER BY wl.worker_id, wl.date
  `, [datePrefix]);

    // All locks for the month
    const locks = queryAll(
        'SELECT worker_id, date FROM day_locks WHERE date LIKE ?',
        [datePrefix]
    );

    // Build lock set
    const lockSet = new Set();
    for (const lock of locks) {
        lockSet.add(`${lock.worker_id}-${lock.date}`);
    }

    // Build matrix: { workerId: { days: { dayNum: [logs] } } }
    const matrix = {};
    for (const worker of workers) {
        matrix[worker.id] = { days: {} };
    }

    for (const log of logs) {
        if (matrix[log.worker_id]) {
            const day = parseInt(log.date.split('-')[2]);
            if (!matrix[log.worker_id].days[day]) {
                matrix[log.worker_id].days[day] = [];
            }
            matrix[log.worker_id].days[day].push(log);
        }
    }

    res.json({
        workers,
        matrix,
        locks: Object.fromEntries([...lockSet].map(k => [k, true])),
        month: parseInt(month),
        year: parseInt(year)
    });
});

// POST /api/logs — create or update a work log entry
router.post('/', authMiddleware, (req, res) => {
    const { worker_id, location_id, date, status, hours, description } = req.body;

    if (!worker_id || !date || !status) {
        return res.status(400).json({ error: 'Radnik, datum i status su obavezni' });
    }

    const validStatuses = ['RAD', 'GO', 'BO', 'SLO'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Nevažeći status' });
    }

    // Check if day is locked (voditelj can't edit locked days)
    if (req.user.role === 'voditelj') {
        const lock = queryOne(
            'SELECT id FROM day_locks WHERE worker_id = ? AND date = ?',
            [parseInt(worker_id), date]
        );
        if (lock) {
            return res.status(403).json({ error: 'Dan je zaključan i ne može se mijenjati' });
        }
    }

    let finalHours = hours || 0;
    if (status === 'GO' || status === 'BO') finalHours = 8;
    if (status === 'SLO') finalHours = 0;

    // 24h daily limit check
    const existingTotal = queryOne(
        'SELECT COALESCE(SUM(hours), 0) as total FROM work_logs WHERE worker_id = ? AND date = ?',
        [parseInt(worker_id), date]
    );

    // Check for existing entry to handle upsert
    let existing = null;
    const finalLocationId = location_id ? parseInt(location_id) : null;

    if (status !== 'RAD') {
        existing = queryOne(
            'SELECT * FROM work_logs WHERE worker_id = ? AND date = ? AND status = ?',
            [parseInt(worker_id), date, status]
        );
    } else {
        existing = queryOne(
            'SELECT * FROM work_logs WHERE worker_id = ? AND date = ? AND location_id = ?',
            [parseInt(worker_id), date, finalLocationId]
        );
    }

    if (existing) {
        const adjustedTotal = existingTotal.total - existing.hours + finalHours;
        if (adjustedTotal > 24) {
            return res.status(400).json({
                error: `Prekoračen dnevni limit od 24h. Trenutno: ${existingTotal.total}h`
            });
        }
        runSql(`
      UPDATE work_logs SET status = ?, hours = ?, description = ?, location_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, finalHours, description || '', finalLocationId, existing.id]);
        const updated = queryOne('SELECT * FROM work_logs WHERE id = ?', [existing.id]);
        return res.json(updated);
    }

    if (existingTotal.total + finalHours > 24) {
        return res.status(400).json({
            error: `Prekoračen dnevni limit od 24h. Trenutno uneseno: ${existingTotal.total}h, pokušaj dodavanja: ${finalHours}h`
        });
    }

    try {
        const result = runSql(`
      INSERT INTO work_logs (worker_id, location_id, date, status, hours, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [parseInt(worker_id), finalLocationId, date, status, finalHours, description || '', req.user.id]);

        const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(log);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri spremanju zapisa: ' + err.message });
    }
});

// DELETE /api/logs/:id — delete a work log entry
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;

    const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [parseInt(id)]);
    if (!log) {
        return res.status(404).json({ error: 'Zapis nije pronađen' });
    }

    // Voditelj can't delete on locked days
    if (req.user.role === 'voditelj') {
        const lock = queryOne(
            'SELECT id FROM day_locks WHERE worker_id = ? AND date = ?',
            [log.worker_id, log.date]
        );
        if (lock) {
            return res.status(403).json({ error: 'Dan je zaključan' });
        }
    }

    runSql('DELETE FROM work_logs WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Zapis je obrisan' });
});

module.exports = router;
