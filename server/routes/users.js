const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, runSql } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — List all users (admin only)
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
    const users = queryAll('SELECT id, username, role, created_at FROM users ORDER BY username');
    res.json(users);
});

// POST /api/users — Create user (admin only)
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Korisničko ime, lozinka i uloga su obavezni' });
    }

    if (!['voditelj', 'racunovodstvo', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Nevažeća uloga' });
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
        return res.status(409).json({ error: 'Korisničko ime već postoji' });
    }

    try {
        const hash = bcrypt.hashSync(password, 10);
        const result = runSql(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hash, role]
        );
        const user = queryOne('SELECT id, username, role, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Greška pri kreiranju korisnika' });
    }
});

// PATCH /api/users/:id — Update user (admin only)
router.patch('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;

    const user = queryOne('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
    if (!user) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    if (role && !['voditelj', 'racunovodstvo', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Nevažeća uloga' });
    }

    if (username && username !== user.username) {
        const dup = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, parseInt(id)]);
        if (dup) {
            return res.status(409).json({ error: 'Korisničko ime već postoji' });
        }
    }

    const updatedUsername = username || user.username;
    const updatedRole = role || user.role;

    if (password) {
        const hash = bcrypt.hashSync(password, 10);
        runSql('UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
            [updatedUsername, hash, updatedRole, parseInt(id)]);
    } else {
        runSql('UPDATE users SET username = ?, role = ? WHERE id = ?',
            [updatedUsername, updatedRole, parseInt(id)]);
    }

    const updated = queryOne('SELECT id, username, role, created_at FROM users WHERE id = ?', [parseInt(id)]);
    res.json(updated);
});

// DELETE /api/users/:id — Delete user (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Ne možete obrisati vlastiti račun' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
    if (!user) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    runSql('DELETE FROM users WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Korisnik je obrisan' });
});

module.exports = router;
