const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/machine-logs
router.get('/', authMiddleware, (req, res) => {
    const { month, year, machine_id, location_id } = req.query;

    let query = `
    SELECT ml.*, 
           m.name as machine_name,
           l.name as location_name
    FROM machine_logs ml
    JOIN machines m ON ml.machine_id = m.id
    JOIN locations l ON ml.location_id = l.id
    WHERE 1=1
  `;
    const params = [];

    if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        query += ' AND ml.date LIKE ?';
        params.push(`${year}-${monthStr}%`);
    }
    if (machine_id) {
        query += ' AND ml.machine_id = ?';
        params.push(parseInt(machine_id));
    }
    if (location_id) {
        query += ' AND ml.location_id = ?';
        params.push(parseInt(location_id));
    }

    query += ' ORDER BY ml.date DESC';

    const logs = queryAll(query, params);
    res.json(logs);
});

// POST /api/machine-logs — create entry
router.post('/', authMiddleware, (req, res) => {
    const { machine_id, location_id, date, hours, description } = req.body;

    if (!machine_id || !location_id || !date || hours === undefined) {
        return res.status(400).json({ error: 'Sva obavezna polja moraju biti popunjena' });
    }

    try {
        const result = runSql(`
      INSERT INTO machine_logs (machine_id, location_id, date, hours, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [parseInt(machine_id), parseInt(location_id), date, hours, description || '', req.user.id]);

        const log = queryOne(`
      SELECT ml.*, m.name as machine_name, l.name as location_name
      FROM machine_logs ml
      JOIN machines m ON ml.machine_id = m.id
      JOIN locations l ON ml.location_id = l.id
      WHERE ml.id = ?
    `, [result.lastInsertRowid]);

        res.status(201).json(log);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri spremanju zapisa' });
    }
});

// PATCH /api/machine-logs/:id/block — računovodstvo toggles blocked
router.patch('/:id/block', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { id } = req.params;

    const log = queryOne('SELECT * FROM machine_logs WHERE id = ?', [parseInt(id)]);
    if (!log) {
        return res.status(404).json({ error: 'Zapis nije pronađen' });
    }

    const newBlocked = log.blocked ? 0 : 1;
    runSql('UPDATE machine_logs SET blocked = ? WHERE id = ?', [newBlocked, parseInt(id)]);

    const updated = queryOne(`
    SELECT ml.*, m.name as machine_name, l.name as location_name
    FROM machine_logs ml
    JOIN machines m ON ml.machine_id = m.id
    JOIN locations l ON ml.location_id = l.id
    WHERE ml.id = ?
  `, [parseInt(id)]);

    res.json(updated);
});

module.exports = router;
