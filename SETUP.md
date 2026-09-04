# Пошаговая инструкция по установке и запуску

## 1. Установка PostgreSQL

### Для Windows:

1. Скачайте PostgreSQL с официального сайта:
   https://www.postgresql.org/download/windows/

2. Запустите установщик и следуйте инструкциям:
   - Запомните пароль для пользователя `postgres`
   - Порт по умолчанию: `5432`
   - Установите компонент pgAdmin 4 (графический интерфейс)

3. После установки PostgreSQL должен автоматически запуститься как служба Windows

### Для macOS:

```bash
# Используя Homebrew
brew install postgresql@15
brew services start postgresql@15
```

### Для Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. Создание базы данных

### Способ 1: Через командную строку

```bash
# Войдите в PostgreSQL (Windows - используйте psql из меню Пуск)
psql -U postgres

# Создайте базу данных
CREATE DATABASE project_tracker;

# Создайте пользователя (опционально)
CREATE USER project_user WITH PASSWORD 'your_password';

# Дайте права пользователю
GRANT ALL PRIVILEGES ON DATABASE project_tracker TO project_user;

# Выход
\q
```

### Способ 2: Через pgAdmin 4

1. Откройте pgAdmin 4
2. Подключитесь к серверу PostgreSQL (пароль от установки)
3. Правый клик на "Databases" → Create → Database
4. Имя: `project_tracker`
5. Нажмите Save

## 3. Настройка .env файла

Файл `.env` уже создан. Отредактируйте строку подключения к базе данных:

```env
DATABASE_URL="postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/project_tracker?schema=public"
```

Замените `ВАШ_ПАРОЛЬ` на пароль, который вы указали при установке PostgreSQL.

Если вы создали отдельного пользователя:

```env
DATABASE_URL="postgresql://project_user:your_password@localhost:5432/project_tracker?schema=public"
```

## 4. Установка зависимостей проекта

```bash
npm install --legacy-peer-deps
```

## 5. Создание таблиц в базе данных

```bash
npx prisma migrate dev --name init
```

Эта команда:
- Создаст все таблицы в базе данных
- Сгенерирует Prisma Client

## 6. Заполнение демо-данными

```bash
npm run seed
```

Это создаст:
- Тестового администратора (email: `admin@example.com`, пароль: `admin123`)
- Тестового пользователя (email: `user@example.com`, пароль: `user123`)
- Несколько тестовых проектов
- Задачи, комментарии и историю изменений

## 7. Запуск сервера разработки

```bash
npm run dev
```

Откройте браузер: http://localhost:3000

## 8. Вход в систему

Используйте тестовые учётные данные:

**Администратор:**
- Email: `admin@example.com`
- Пароль: `admin123`

**Пользователь:**
- Email: `user@example.com`
- Пароль: `user123`

---

## Настройка Email-уведомлений (опционально)

Для работы email-напоминаний отредактируйте `.env`:

### Использование Gmail:

1. Включите двухфакторную аутентификацию в вашем аккаунте Google
2. Создайте "Пароль приложения": https://myaccount.google.com/apppasswords
3. Укажите в `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="Project Tracker <your-email@gmail.com>"
```

### Использование Yandex:

```env
SMTP_HOST="smtp.yandex.ru"
SMTP_PORT="465"
SMTP_USER="your-email@yandex.ru"
SMTP_PASSWORD="your-password"
EMAIL_FROM="Project Tracker <your-email@yandex.ru>"
```

### Использование Mail.ru:

```env
SMTP_HOST="smtp.mail.ru"
SMTP_PORT="465"
SMTP_USER="your-email@mail.ru"
SMTP_PASSWORD="your-password"
EMAIL_FROM="Project Tracker <your-email@mail.ru>"
```

---

## Проверка базы данных

Вы можете просмотреть данные в базе используя:

```bash
npx prisma studio
```

Откроется графический интерфейс: http://localhost:5555

---

## Устранение неполадок

### PostgreSQL не запускается

**Windows:**
1. Откройте "Службы" (services.msc)
2. Найдите "postgresql-x64-15"
3. Правый клик → Запустить

**macOS:**
```bash
brew services restart postgresql@15
```

**Linux:**
```bash
sudo systemctl restart postgresql
```

### Ошибка подключения к базе данных

1. Проверьте, что PostgreSQL запущен
2. Проверьте правильность пароля в `.env`
3. Проверьте, что база данных `project_tracker` создана
4. Проверьте порт (по умолчанию 5432)

### Ошибки при миграции

```bash
# Сбросить базу данных и создать заново
npx prisma migrate reset

# Это удалит все данные и пересоздаст таблицы
```

---

## Следующие шаги

После успешного запуска вы можете:

1. **Создать свой первый проект**
   - Нажмите "+ Новый проект"
   - Заполните форму
   - Добавьте задачи

2. **Настроить таблицу**
   - Добавьте пользовательские столбцы
   - Измените порядок столбцов
   - Настройте фильтры

3. **Пригласить пользователей**
   - Зарегистрируйте новых пользователей
   - Назначьте их на проекты

4. **Настроить уведомления**
   - Перейдите в Настройки
   - Настройте email-напоминания
   - Установите сроки уведомлений
