const bcrypt = require('bcryptjs');
const { initDatabase, queryOne, runSql } = require('./database');

async function seed() {
    await initDatabase();

    // Seed users
    const users = [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'voditelj', password: 'voditelj123', role: 'voditelj' },
        { username: 'racunovodstvo', password: 'racuno123', role: 'racunovodstvo' },
    ];

    for (const u of users) {
        const exists = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
        if (!exists) {
            const hash = bcrypt.hashSync(u.password, 10);
            runSql('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                [u.username, hash, u.role]);
            console.log(`  ✅ Korisnik '${u.username}' kreiran`);
        } else {
            console.log(`  ⏭️  Korisnik '${u.username}' već postoji`);
        }
    }

    // Seed sample trucks
    const trucks = ['Kamion 1', 'Kamion 2'];
    for (const name of trucks) {
        const exists = queryOne('SELECT id FROM trucks WHERE name = ?', [name]);
        if (!exists) {
            runSql('INSERT INTO trucks (name) VALUES (?)', [name]);
            console.log(`  ✅ Kamion '${name}' kreiran`);
        }
    }

    console.log('🌱 Seed završen');
}

seed().catch(console.error);
