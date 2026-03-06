const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/truck-logs
router.get('/', authMiddleware, (req, res) => {
    const { month, year, truck_id, location_id } = req.query;

    let query = `
    SELECT tl.*, 
           t.name as truck_name,
           l.name as location_name
    FROM truck_logs tl
    JOIN trucks t ON tl.truck_id = t.id
    JOIN locations l ON tl.location_id = l.id
    WHERE 1=1
  `;
    const params = [];

    if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        query += ' AND tl.date LIKE ?';
        params.push(`${year}-${monthStr}%`);
    }
    if (truck_id) {
        query += ' AND tl.truck_id = ?';
        params.push(parseInt(truck_id));
    }
    if (location_id) {
        query += ' AND tl.location_id = ?';
        params.push(parseInt(location_id));
    }

    query += ' ORDER BY tl.date DESC';

    const logs = queryAll(query, params);
    res.json(logs);
});

// POST /api/truck-logs — create entry
router.post('/', authMiddleware, (req, res) => {
    const { truck_id, location_id, date, km, description } = req.body;

    if (!truck_id || !location_id || !date || km === undefined) {
        return res.status(400).json({ error: 'Sva obavezna polja moraju biti popunjena' });
    }

    try {
        const result = runSql(`
      INSERT INTO truck_logs (truck_id, location_id, date, km, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [parseInt(truck_id), parseInt(location_id), date, km, description || '', req.user.id]);

        const log = queryOne(`
      SELECT tl.*, t.name as truck_name, l.name as location_name
      FROM truck_logs tl
      JOIN trucks t ON tl.truck_id = t.id
      JOIN locations l ON tl.location_id = l.id
      WHERE tl.id = ?
    `, [result.lastInsertRowid]);

        res.status(201).json(log);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri spremanju zapisa' });
    }
});

// PATCH /api/truck-logs/:id/block — računovodstvo toggles blocked
router.patch('/:id/block', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { id } = req.params;

    const log = queryOne('SELECT * FROM truck_logs WHERE id = ?', [parseInt(id)]);
    if (!log) {
        return res.status(404).json({ error: 'Zapis nije pronađen' });
    }

    const newBlocked = log.blocked ? 0 : 1;
    runSql('UPDATE truck_logs SET blocked = ? WHERE id = ?', [newBlocked, parseInt(id)]);

    const updated = queryOne(`
    SELECT tl.*, t.name as truck_name, l.name as location_name
    FROM truck_logs tl
    JOIN trucks t ON tl.truck_id = t.id
    JOIN locations l ON tl.location_id = l.id
    WHERE tl.id = ?
  `, [parseInt(id)]);

    res.json(updated);
});

module.exports = router;
