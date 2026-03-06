const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/machines
router.get('/', authMiddleware, (req, res) => {
    const showAll = req.query.all === 'true';
    const machines = showAll
        ? queryAll('SELECT * FROM machines ORDER BY name')
        : queryAll('SELECT * FROM machines WHERE active = 1 ORDER BY name');
    res.json(machines);
});

// POST /api/machines
router.post('/', authMiddleware, requireRole('racunovodstvo'), (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Naziv stroja je obavezan' });
    }

    try {
        const result = runSql('INSERT INTO machines (name) VALUES (?)', [name]);
        const machine = queryOne('SELECT * FROM machines WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(machine);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dodavanju stroja' });
    }
});

// PATCH /api/machines/:id
router.patch('/:id', authMiddleware, requireRole('racunovodstvo'), (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body;

    const machine = queryOne('SELECT * FROM machines WHERE id = ?', [parseInt(id)]);
    if (!machine) {
        return res.status(404).json({ error: 'Stroj nije pronađen' });
    }

    const updatedName = name !== undefined ? name : machine.name;
    const updatedActive = active !== undefined ? (active ? 1 : 0) : machine.active;

    runSql('UPDATE machines SET name = ?, active = ? WHERE id = ?',
        [updatedName, updatedActive, parseInt(id)]);

    const updated = queryOne('SELECT * FROM machines WHERE id = ?', [parseInt(id)]);
    res.json(updated);
});

module.exports = router;
