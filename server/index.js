const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const { usingDefaultSecret } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const locationRoutes = require('./routes/locations');
const logRoutes = require('./routes/logs');
const dayLockRoutes = require('./routes/day-locks');
const machineRoutes = require('./routes/machines');
const machineLogRoutes = require('./routes/machine-logs');
const truckRoutes = require('./routes/trucks');
const truckLogRoutes = require('./routes/truck-logs');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/day-locks', dayLockRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/machine-logs', machineLogRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/truck-logs', truckLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

async function start() {
    await initDatabase();
    if (usingDefaultSecret) {
        console.warn('');
        console.warn('⚠️  UPOZORENJE: Koristi se zadani (nesigurni) JWT ključ!');
        console.warn('⚠️  Postavi vlastiti tajni ključ kroz env varijablu JWT_SECRET.');
        console.warn('⚠️  Vidi INSTALL.md → "Sigurnosni ključ (JWT_SECRET)".');
        console.warn('');
    }
    app.listen(PORT, () => {
        console.log(`🏗️  Šihterica server pokrenut na portu ${PORT}`);
    });
}

start();
