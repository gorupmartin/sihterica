const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Allowed settings keys with validation
const NUMERIC_KEYS = ['gablec_rate', 'gablec_min_hours'];

// GET /api/settings — returns all settings as { key: number }
router.get('/', authMiddleware, (req, res) => {
    const rows = queryAll('SELECT key, value FROM settings');
    const out = {};
    for (const r of rows) {
        const num = parseFloat(r.value);
        out[r.key] = Number.isNaN(num) ? r.value : num;
    }
    res.json(out);
});

// PATCH /api/settings — update settings (racunovodstvo/admin)
router.patch('/', authMiddleware, requireRole('racunovodstvo', 'admin'), (req, res) => {
    const updates = req.body || {};

    for (const key of Object.keys(updates)) {
        if (!NUMERIC_KEYS.includes(key)) {
            return res.status(400).json({ error: `Nepoznata postavka: ${key}` });
        }
        const value = parseFloat(updates[key]);
        if (Number.isNaN(value) || value < 0) {
            return res.status(400).json({ error: `Neispravna vrijednost za ${key}` });
        }
        const exists = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
        if (exists) {
            runSql('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
        } else {
            runSql('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
        }
    }

    const rows = queryAll('SELECT key, value FROM settings');
    const out = {};
    for (const r of rows) {
        const num = parseFloat(r.value);
        out[r.key] = Number.isNaN(num) ? r.value : num;
    }
    res.json(out);
});

module.exports = router;
