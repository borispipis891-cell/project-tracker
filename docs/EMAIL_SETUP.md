# Настройка Email уведомлений

## Обзор

Система поддерживает email-уведомления для:
1. **Приглашений в проект** - когда пользователя добавляют как участника
2. **Приближающихся дедлайнов** - за 3 дня и за 1 день до дедлайна
3. **Изменений в проектах** - когда меняется статус, приоритет и другие параметры

## Настройка SMTP

Для отправки email нужно настроить SMTP сервер в файле `.env`:

```env
# --- Email / SMTP ---
SMTP_HOST="smtp.gmail.com"           # Для Gmail
SMTP_PORT="587"                      # Стандартный порт для TLS
SMTP_USER="your-email@gmail.com"     # Ваш email
SMTP_PASSWORD="your-app-password"    # Пароль приложения
EMAIL_FROM="Project Tracker <noreply@example.com>"  # От кого письма

# --- Адрес сайта ---
APP_URL="http://localhost:3000"      # Адрес вашего приложения
```

### Примеры для популярных сервисов

#### Gmail
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # App Password из Google Account
```

**Получение App Password для Gmail:**
1. Перейдите в https://myaccount.google.com/security
2. Включите двухфакторную аутентификацию
3. Перейдите в "App passwords" (Пароли приложений)
4. Создайте новый пароль для "Mail"
5. Используйте сгенерированный пароль в SMTP_PASSWORD

#### Yandex
```env
SMTP_HOST="smtp.yandex.ru"
SMTP_PORT="587"
SMTP_USER="your-email@yandex.ru"
SMTP_PASSWORD="your-password"
```

#### Mail.ru
```env
SMTP_HOST="smtp.mail.ru"
SMTP_PORT="587"
SMTP_USER="your-email@mail.ru"
SMTP_PASSWORD="your-password"
```

#### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
```

## Тестирование без SMTP

Если SMTP не настроен, система будет просто логировать письма в консоль:

```
📧 Email (not sent, SMTP not configured):
To: user@example.com
Subject: Вы приглашены в проект "Проект 1"
Body: ...
```

Это полезно для разработки и тестирования.

## Настройки уведомлений для пользователей

Каждый пользователь может управлять своими уведомлениями в разделе **Настройки**:

- ✉️ **Приглашения в проекты** - получать уведомления при добавлении в проект
- ⏰ **Напоминания о дедлайнах** - уведомления за 3 дня и 1 день до дедлайна
- 📝 **Изменения проектов** - уведомления об изменениях в проектах, где пользователь участник

## Автоматические напоминания о дедлайнах

Для автоматической отправки напоминаний о дедлайнах нужно настроить cron-задачу.

### API endpoint
```
POST /api/notifications/deadline-reminders
Authorization: Bearer <CRON_SECRET>
```

### Настройка cron (Linux/Mac)

Добавьте в crontab (`crontab -e`):

```bash
# Отправка напоминаний каждый день в 9:00
0 9 * * * curl -X POST https://your-domain.com/api/notifications/deadline-reminders \
  -H "Authorization: Bearer your-secret-cron-key-change-this-in-production"
```

### Настройка через Vercel Cron (для продакшена)

Создайте файл `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/notifications/deadline-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

И добавьте `CRON_SECRET` в переменные окружения Vercel.

### Настройка через Windows Task Scheduler

1. Откройте Task Scheduler
2. Создайте новую задачу
3. Триггер: Ежедневно в 9:00
4. Действие: Запуск программы
5. Программа: `curl.exe`
6. Аргументы:
```
-X POST http://localhost:3000/api/notifications/deadline-reminders -H "Authorization: Bearer your-secret-cron-key-change-this-in-production"
```

## Безопасность

⚠️ **Важно:**
- Не коммитьте `.env` в git
- Используйте сложный `CRON_SECRET` в продакшене
- Для Gmail используйте App Passwords, не основной пароль
- Храните SMTP пароли в безопасном месте

## Проверка работы

1. Настройте SMTP в `.env`
2. Перезапустите сервер: `npm run dev`
3. Пригласите пользователя в проект
4. Проверьте почтовый ящик приглашённого пользователя

Логи отправки email можно увидеть в консоли сервера:
```
📧 Email sent: <message-id>
```

## Устранение проблем

### Письма не отправляются
- Проверьте правильность настроек SMTP в `.env`
- Проверьте, что SMTP сервер доступен
- Для Gmail убедитесь, что используете App Password, а не обычный пароль
- Проверьте логи сервера на наличие ошибок

### Письма попадают в спам
- Настройте SPF, DKIM, DMARC записи для вашего домена
- Используйте профессиональный SMTP сервис (SendGrid, Mailgun)
- Проверьте репутацию IP адреса вашего SMTP сервера

### Пользователь не получает уведомления
- Проверьте настройки уведомлений пользователя в разделе "Настройки"
- Убедитесь, что email пользователя корректный
- Проверьте папку "Спам" в почтовом ящике
