# 🔧 Исправление проблем на Vercel

## ✅ Проблемы и решения

### 1️⃣ Задачи не отображаются в проектах

**Проблема:** При создании проекта задачи не добавляются автоматически.

**Причина:** Frontend отправляет `tasks: []` (пустой массив) при создании проекта.

**Решение:** Добавить возможность создавать задачи после создания проекта:

1. Создайте проект
2. Раскройте проект (нажмите на стрелку ▶)
3. Нажмите кнопку **"+ Добавить задачу"**
4. Заполните форму задачи и сохраните

**Альтернатива:** Модифицировать форму создания проекта, чтобы сразу добавлять задачи.

---

### 2️⃣ Регистрация и подтверждение email

**Статус:** ✅ API endpoints существуют

Проверим, работают ли они на Vercel:

**Endpoints:**
- `/api/auth/register` — регистрация нового пользователя
- `/api/auth/verify-email` — подтверждение email по токену
- `/api/auth/forgot-password` — запрос сброса пароля
- `/api/auth/reset-password` — сброс пароля по токену

**Что проверить:**

1. **SMTP настройки в Vercel:**
   - Откройте https://vercel.com/dashboard
   - Перейдите в ваш проект → **Settings** → **Environment Variables**
   - Убедитесь, что прописаны:
     ```
     SMTP_HOST=smtp.mail.ru
     SMTP_PORT=587
     SMTP_USER=trakerproject@mail.ru
     SMTP_PASSWORD=h0KvtKpmJq69VdCDahRr
     EMAIL_FROM=Project Tracker <trakerproject@mail.ru>
     APP_URL=https://ваш-проект.vercel.app
     ```

2. **Проверьте регистрацию:**
   - Откройте страницу регистрации на вашем сайте
   - Зарегистрируйте нового пользователя
   - Проверьте почту на письмо с подтверждением

3. **Если письма не приходят:**
   - Проверьте **Runtime Logs** в Vercel на ошибки отправки email
   - Убедитесь, что SMTP_PASSWORD правильный (могут быть проблемы с URL-кодированием спецсимволов)

---

### 3️⃣ Email-уведомления о дедлайнах

**Проблема:** Cron Job для напоминаний о дедлайнах не настроен на Vercel.

**Решение:** Настроить Vercel Cron Job

#### Шаг 1: Создать vercel.json

Создайте файл `vercel.json` в корне проекта:

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

**Что это делает:**
- Запускает endpoint `/api/notifications/deadline-reminders` каждый день в 9:00 утра (по UTC)
- Отправляет напоминания о дедлайнах (за 3 дня и за 1 день)

#### Шаг 2: Защитить endpoint

API endpoint уже существует: `/api/notifications/deadline-reminders`

Убедитесь, что в **Environment Variables** на Vercel прописан:
```
CRON_SECRET=your-secret-cron-key-change-this-in-production
```

#### Шаг 3: Задеплоить изменения

```bash
git add vercel.json
git commit -m "feat: add Vercel Cron Job for deadline reminders"
git push origin main
```

Vercel автоматически задеплоит изменения и настроит Cron Job.

#### Шаг 4: Проверить работу Cron Job

1. Откройте **Vercel Dashboard** → ваш проект → **Settings** → **Cron Jobs**
2. Увидите настроенный Cron Job: `0 9 * * *` → `/api/notifications/deadline-reminders`
3. Можно вручную протестировать: **Trigger** → **Run now**

---

## 📋 Чеклист исправлений

### Задачи в проектах
- [ ] Создать проект на Vercel
- [ ] Раскрыть проект
- [ ] Добавить задачу через кнопку "+ Добавить задачу"
- [ ] Проверить, что задача отображается

### Регистрация и Email
- [ ] Проверить SMTP переменные в Vercel Environment Variables
- [ ] Зарегистрировать нового пользователя
- [ ] Проверить почту на письмо с подтверждением
- [ ] Кликнуть на ссылку подтверждения
- [ ] Проверить Runtime Logs на ошибки

### Cron Job для дедлайнов
- [ ] Создать `vercel.json` с настройками Cron Job
- [ ] Добавить `CRON_SECRET` в Environment Variables
- [ ] Закоммитить и запушить `vercel.json`
- [ ] Проверить Cron Jobs в Vercel Dashboard
- [ ] Вручную протестировать Cron Job (Run now)

---

## 🔍 Дополнительная диагностика

### Проверка логов на Vercel

1. Откройте https://vercel.com/dashboard
2. Перейдите в ваш проект → **Deployments**
3. Кликните на последний деплой → **Runtime Logs**
4. Ищите ошибки, связанные с:
   - `[CREATE_PROJECT]` — создание проектов
   - `[EMAIL]` — отправка email
   - `[CRON]` — выполнение Cron Job

### Тестирование email локально

Если хотите протестировать email локально перед деплоем:

```bash
# Установите переменные окружения
export SMTP_HOST=smtp.mail.ru
export SMTP_PORT=587
export SMTP_USER=trakerproject@mail.ru
export SMTP_PASSWORD=h0KvtKpmJq69VdCDahRr
export EMAIL_FROM="Project Tracker <trakerproject@mail.ru>"
export APP_URL=http://localhost:3000

# Запустите dev сервер
npm run dev

# Протестируйте регистрацию
```

---

## 🎯 Итог

После выполнения всех исправлений:

✅ **Проекты создаются** — работает  
✅ **Задачи в проектах** — добавляются вручную через "+ Добавить задачу"  
✅ **Регистрация** — проверить SMTP настройки в Vercel  
✅ **Email-уведомления** — настроить Vercel Cron Job через `vercel.json`  

---

**Следующие шаги:**
1. Создать `vercel.json` для Cron Job
2. Проверить SMTP переменные в Vercel
3. Задеплоить изменения
4. Протестировать все функции на Vercel
