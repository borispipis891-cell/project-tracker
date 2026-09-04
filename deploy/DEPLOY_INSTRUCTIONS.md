# 🚀 Инструкция по деплою на VPS

## Данные сервера
- **IP:** 159.194.243.41
- **User:** root
- **Password:** NU5QIkY5IYm9
- **OS:** Ubuntu 26.04

## Шаг 1: Подключиться к серверу

Используй любой SSH клиент (PuTTY, встроенный терминал Windows, или терминал в панели Beget):

```bash
ssh root@159.194.243.41
```

Введи пароль: `NU5QIkY5IYm9`

## Шаг 2: Настроить сервер

Скопируй и выполни эти команды **по очереди**:

### 2.1. Обновить систему и установить Node.js

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # проверка установки
```

### 2.2. Установить PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
```

### 2.3. Создать базу данных

```bash
sudo -u postgres psql -c "CREATE DATABASE projecttracker;"
sudo -u postgres psql -c "CREATE USER projectuser WITH PASSWORD 'P@ssw0rd2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE projecttracker TO projectuser;"
sudo -u postgres psql -d projecttracker -c "GRANT ALL ON SCHEMA public TO projectuser;"
```

### 2.4. Установить Nginx и PM2

```bash
apt install -y nginx
npm install -g pm2
```

### 2.5. Настроить firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

## Шаг 3: Склонировать и настроить приложение

### 3.1. Клонировать репозиторий

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/borispipis891-cell/project-tracker.git
cd project-tracker
```

### 3.2. Создать .env файл

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://projectuser:P@ssw0rd2024!@localhost:5432/projecttracker"
NEXTAUTH_SECRET="super-secret-key-change-this-$(date +%s | sha256sum | base64 | head -c 32)"
NEXTAUTH_URL="http://159.194.243.41:3000"

# SMTP Settings (настрой свою почту)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Cloudinary (опционально)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

APP_URL="http://159.194.243.41:3000"
NODE_ENV="production"
EOF
```

**⚠️ ВАЖНО:** Отредактируй SMTP настройки для email уведомлений:
```bash
nano .env
```
Нажми `Ctrl+X`, затем `Y`, затем `Enter` для сохранения.

### 3.3. Установить зависимости и собрать

```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
```

## Шаг 4: Запустить приложение с PM2

```bash
pm2 start npm --name "project-tracker" -- start
pm2 save
pm2 startup
```

Скопируй и выполни команду, которую выдаст `pm2 startup`.

## Шаг 5: Настроить Nginx

```bash
cat > /etc/nginx/sites-available/project-tracker << 'EOF'
server {
    listen 80;
    server_name 159.194.243.41;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/project-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## ✅ Готово!

Приложение доступно по адресу: **http://159.194.243.41**

## 🔧 Полезные команды

```bash
# Посмотреть логи
pm2 logs project-tracker

# Перезапустить приложение
pm2 restart project-tracker

# Остановить приложение
pm2 stop project-tracker

# Статус
pm2 status

# Посмотреть логи Nginx
tail -f /var/log/nginx/error.log
```

## 🔄 Обновление приложения

Когда нужно задеплоить изменения:

```bash
cd /var/www/project-tracker
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart project-tracker
```

## 🌐 Добавить домен (опционально)

Если есть домен (например, `myproject.ru`):

1. В DNS настройках домена добавь A-запись: `myproject.ru` → `159.194.243.41`
2. На сервере отредактируй Nginx конфиг:
```bash
nano /etc/nginx/sites-available/project-tracker
```
Замени `server_name 159.194.243.41;` на `server_name myproject.ru www.myproject.ru;`

3. Установи SSL сертификат:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d myproject.ru -d www.myproject.ru
```
