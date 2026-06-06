const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = 'sihterica_secret_key_2024_promijeni_me';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
const usingDefaultSecret = !process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Niste prijavljeni' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Nevažeći token' });
    }
}

// Accept multiple roles: requireRole('admin', 'racunovodstvo')
function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Nemate pristup ovoj funkciji' });
        }
        next();
    };
}

module.exports = { authMiddleware, requireRole, JWT_SECRET, usingDefaultSecret };
