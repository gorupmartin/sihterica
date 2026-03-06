const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/workers
// ?all=true — include blocked workers
// ?month=&year= — include blocked workers that have hours in that month
router.get('/', authMiddleware, (req, res) => {
    const { all, month, year } = req.query;

    if (all === 'true') {
        const workers = queryAll('SELECT * FROM workers ORDER BY surname, name');
        return res.json(workers);
    }

    if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const datePrefix = `${year}-${monthStr}%`;

        // Active workers + blocked workers that have logs this month
        const workers = queryAll(`
      SELECT DISTINCT w.* FROM workers w
      WHERE w.active = 1
      UNION
      SELECT DISTINCT w.* FROM workers w
      INNER JOIN work_logs wl ON w.id = wl.worker_id
      WHERE w.active = 0 AND wl.date LIKE ?
      ORDER BY surname, name
    `, [datePrefix]);
        return res.json(workers);
    }

    const workers = queryAll('SELECT * FROM workers WHERE active = 1 ORDER BY surname, name');
    res.json(workers);
});

// POST /api/workers
router.post('/', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { name, surname } = req.body;
    if (!name || !surname) {
        return res.status(400).json({ error: 'Ime i prezime su obavezni' });
    }

    try {
        const result = runSql('INSERT INTO workers (name, surname) VALUES (?, ?)', [name, surname]);
        const worker = queryOne('SELECT * FROM workers WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dodavanju radnika' });
    }
});

// PATCH /api/workers/:id
router.patch('/:id', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { id } = req.params;
    const { name, surname, active } = req.body;

    const worker = queryOne('SELECT * FROM workers WHERE id = ?', [parseInt(id)]);
    if (!worker) {
        return res.status(404).json({ error: 'Radnik nije pronađen' });
    }

    const updatedName = name !== undefined ? name : worker.name;
    const updatedSurname = surname !== undefined ? surname : worker.surname;
    const updatedActive = active !== undefined ? (active ? 1 : 0) : worker.active;

    runSql('UPDATE workers SET name = ?, surname = ?, active = ? WHERE id = ?',
        [updatedName, updatedSurname, updatedActive, parseInt(id)]);

    const updated = queryOne('SELECT * FROM workers WHERE id = ?', [parseInt(id)]);
    res.json(updated);
});

module.exports = router;
