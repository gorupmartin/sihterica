const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/locations
router.get('/', authMiddleware, (req, res) => {
    const showAll = req.query.all === 'true';
    const locations = showAll
        ? queryAll('SELECT * FROM locations ORDER BY name')
        : queryAll('SELECT * FROM locations WHERE active = 1 ORDER BY name');
    res.json(locations);
});

// POST /api/locations
router.post('/', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Naziv gradilišta je obavezan' });
    }

    try {
        const existing = queryOne('SELECT id FROM locations WHERE name = ?', [name]);
        if (existing) {
            return res.status(409).json({ error: 'Gradilište s tim nazivom već postoji' });
        }
        const result = runSql('INSERT INTO locations (name) VALUES (?)', [name]);
        const location = queryOne('SELECT * FROM locations WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(location);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri dodavanju gradilišta' });
    }
});

// PATCH /api/locations/:id
router.patch('/:id', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body;

    const location = queryOne('SELECT * FROM locations WHERE id = ?', [parseInt(id)]);
    if (!location) {
        return res.status(404).json({ error: 'Gradilište nije pronađeno' });
    }

    const updatedName = name !== undefined ? name : location.name;
    const updatedActive = active !== undefined ? (active ? 1 : 0) : location.active;

    try {
        if (name !== undefined && name !== location.name) {
            const dup = queryOne('SELECT id FROM locations WHERE name = ? AND id != ?', [updatedName, parseInt(id)]);
            if (dup) {
                return res.status(409).json({ error: 'Gradilište s tim nazivom već postoji' });
            }
        }
        runSql('UPDATE locations SET name = ?, active = ? WHERE id = ?',
            [updatedName, updatedActive, parseInt(id)]);
        const updated = queryOne('SELECT * FROM locations WHERE id = ?', [parseInt(id)]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri ažuriranju gradilišta' });
    }
});

module.exports = router;
