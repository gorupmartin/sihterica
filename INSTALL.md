# Šihterica - Instalacija na Ubuntu Server

## Preduvjeti

```bash
# Ažuriraj sustav
sudo apt update && sudo apt upgrade -y

# Instaliraj Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Provjeri verzije
node -v
npm -v
```

## 1. Kopiraj aplikaciju na server

```bash
# Kopiraj projekt u /opt/sihterica
sudo mkdir -p /opt/sihterica
sudo cp -r ./* /opt/sihterica/
sudo chown -R www-data:www-data /opt/sihterica
```

## 2. Instaliraj ovisnosti

```bash
cd /opt/sihterica

# Instaliraj root ovisnosti
sudo -u www-data npm install

# Instaliraj server ovisnosti
cd server && sudo -u www-data npm install && cd ..

# Instaliraj client ovisnosti i buildaj
cd client && sudo -u www-data npm install && sudo -u www-data npm run build && cd ..
```

## 3. Pokreni seed (početni podaci)

```bash
cd /opt/sihterica
sudo -u www-data node server/seed.js
```

Ovo stvara:
- Korisnik `voditelj` / `voditelj123` (uloga: voditelj)
- Korisnik `racunovodstvo` / `racuno123` (uloga: računovodstvo)
- 8 testnih radnika
- 4 testna gradilišta
- 4 testna stroja

## 4. Postavi systemd servis

```bash
# Kopiraj servis datoteku
sudo cp /opt/sihterica/sihterica.service /etc/systemd/system/

# Učitaj i pokreni
sudo systemctl daemon-reload
sudo systemctl enable sihterica
sudo systemctl start sihterica

# Provjeri status
sudo systemctl status sihterica
```

## 5. Provjera

```bash
# Provjeri logove
sudo journalctl -u sihterica -f

# Testiraj
curl http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"voditelj","password":"voditelj123"}'
```

Aplikacija je dostupna na: `http://<IP-servera>:3001`

## Korisne naredbe

```bash
# Restart
sudo systemctl restart sihterica

# Stop
sudo systemctl stop sihterica

# Logovi
sudo journalctl -u sihterica --since today

# Vraćanje baze (obriše i ponovno stvori)
sudo systemctl stop sihterica
sudo rm /opt/sihterica/server/db/sihterica.sqlite
sudo -u www-data node /opt/sihterica/server/seed.js
sudo systemctl start sihterica
```

## Opcija: Nginx Reverse Proxy

```bash
sudo apt install -y nginx

# Kreiraj konfiguraciju
sudo tee /etc/nginx/sites-available/sihterica > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/sihterica /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```
