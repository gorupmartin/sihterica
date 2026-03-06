# 🏗️ Šihterica

Aplikacija za praćenje radnog vremena, strojeva i kamiona na gradilištima. Desktop-centric web aplikacija s role-based pristupom.

## ✨ Značajke

### 📅 Satnica (Kalendar)
- Kalendarski prikaz svih radnika po danima
- Unos sati rada (RAD, GO, BO, SLO) s opisom i gradilištem
- Voditelj zaključava dane — računovodstvo otključava
- Boje ćelija: 🟢 zaključano, 🟡 nezaključano, ⬛ prazno

### 🚜 Bageri
- Evidencija radnih sati bagera po gradilištima
- Računovodstvo može blokirati/odblokirati unose

### 🚛 Kamioni
- Evidencija prijeđenih kilometara kamiona
- Isti sustav blokiranja kao za bagere

### 📊 Izvještaji
- 4 taba: Radnici, Gradilišta, Bageri, Kamioni
- Prikazuju se **samo zaključani** sati (radnici/gradilišta)
- Prikazuju se **samo neblokirani** unosi (bageri/kamioni)

### ⚙️ Upravljanje
- CRUD za radnike, gradilišta, bagere i kamione
- Dostupno samo računovodstvu i adminu

## 👥 Uloge

| Uloga | Pristup |
|-------|---------|
| **Voditelj** | Unosi sate, zaključava dane, unosi bagere/kamione |
| **Računovodstvo** | Sve od voditelja + otključavanje, blokiranje, upravljanje |
| **Admin** | Sve + upravljanje korisnicima |

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + SQLite (sql.js)
- **Auth**: JWT

## 🚀 Instalacija

### Preduvjeti
- Node.js 18+
- npm

### Backend
```bash
cd server
npm install
node seed.js    # Inicijalizacija baze s testnim podacima
node index.js   # Pokreće server na portu 3001
```

### Frontend
```bash
cd client
npm install
npm run dev     # Pokreće dev server na portu 5173
```

Aplikacija je dostupna na **http://localhost:5173**

### Testni korisnici

| Korisnik | Lozinka | Uloga |
|----------|---------|-------|
| admin | admin123 | Administrator |
| voditelj | voditelj123 | Voditelj |
| racunovodstvo | racuno123 | Računovodstvo |

## 📁 Struktura projekta

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/client.js   # API klijent
│   │   ├── components/     # Layout, DatePicker
│   │   ├── context/        # AuthContext
│   │   └── pages/          # Stranice aplikacije
│   └── vite.config.js
├── server/                 # Express backend
│   ├── database.js         # SQLite schema + init
│   ├── index.js            # Server entry point
│   ├── middleware/auth.js   # JWT auth middleware
│   ├── routes/             # API rute
│   └── seed.js             # Seed skripta
└── README.md
```

## 📄 Licenca

Open source projekt.
