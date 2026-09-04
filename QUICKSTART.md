# 🚀 Быстрый старт (5 минут)

Если вы уже знакомы с Node.js и PostgreSQL — следуйте этой короткой инструкции.

## Шаг 1: Установите зависимости

```bash
npm install --legacy-peer-deps
```

## Шаг 2: Запустите PostgreSQL

### Docker (рекомендуется)

```bash
docker run --name project-tracker-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=project_tracker \
  -p 5432:5432 -d postgres:16
```

### Или используйте существующий PostgreSQL

Создайте базу данных:

```sql
CREATE DATABASE project_tracker;
```

## Шаг 3: Настройте .env

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/project_tracker?schema=public"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

## Шаг 4: Создайте таблицы

```bash
npx prisma migrate dev --name init
```

## Шаг 5: Заполните демо-данными

```bash
npm run seed
```

## Шаг 6: Запустите сервер

```bash
npm run dev
```

Откройте: **http://localhost:3000**

## Тестовый вход

**Администратор:**
- Email: `admin@example.com`
- Пароль: `Admin12345!`

---

## Проверка готовности

```bash
npm run check
```

---

## Возможные проблемы

### PostgreSQL не подключается

```bash
# Проверьте статус Docker контейнера
docker ps

# Если контейнер не запущен
docker start project-tracker-db

# Проверьте логи
docker logs project-tracker-db
```

### Ошибка при миграции

```bash
# Сбросьте базу и пересоздайте
npx prisma migrate reset
```

### Порт 3000 занят

Измените порт в `package.json`:

```json
"dev": "next dev -p 3001"
```

---

Подробная инструкция: **[README.md](./README.md)** и **[SETUP.md](./SETUP.md)**
