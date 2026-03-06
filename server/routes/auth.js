const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni' });
    }

    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
        return res.status(401).json({ error: 'Neispravno korisničko ime ili lozinka' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Neispravno korisničko ime ili lozinka' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role }
    });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
