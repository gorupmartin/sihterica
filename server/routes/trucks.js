const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/trucks
router.get('/', authMiddleware, (req, res) => {
    const { all } = req.query;
    let query = 'SELECT * FROM trucks';
    if (all !== 'true') {
        query += ' WHERE active = 1';
    }
    query += ' ORDER BY name';
    res.json(queryAll(query));
});

// POST /api/trucks — create truck (racunovodstvo/admin)
router.post('/', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Naziv kamiona je obavezan' });
    }

    const result = runSql(
        'INSERT INTO trucks (name) VALUES (?)',
        [name.trim()]
    );
    const truck = queryOne('SELECT * FROM trucks WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(truck);
});

// PATCH /api/trucks/:id — update truck
router.patch('/:id', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body;

    const truck = queryOne('SELECT * FROM trucks WHERE id = ?', [parseInt(id)]);
    if (!truck) {
        return res.status(404).json({ error: 'Kamion nije pronađen' });
    }

    if (name !== undefined) {
        runSql('UPDATE trucks SET name = ? WHERE id = ?', [name.trim(), parseInt(id)]);
    }
    if (active !== undefined) {
        runSql('UPDATE trucks SET active = ? WHERE id = ?', [active ? 1 : 0, parseInt(id)]);
    }

    const updated = queryOne('SELECT * FROM trucks WHERE id = ?', [parseInt(id)]);
    res.json(updated);
});

module.exports = router;
