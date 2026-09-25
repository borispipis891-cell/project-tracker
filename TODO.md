# ✅ Что сделано

Все исправления применены и закоммичены. Vercel автоматически начнёт деплой.

## 📋 Осталось выполнить вручную

### 1. Применить миграцию к production БД (КРИТИЧНО!)

**Откройте Supabase Dashboard → SQL Editor и выполните:**

```sql
-- Add VerificationToken table if not exists, and add type column if missing
-- This migration is safe and preserves existing data

-- Create VerificationToken table if it doesn't exist
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- Add type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='VerificationToken' AND column_name='type'
    ) THEN
        ALTER TABLE "VerificationToken" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'EMAIL_VERIFY';
    END IF;
END $$;

-- Create unique constraint on token if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'VerificationToken_token_key'
    ) THEN
        ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_token_key" UNIQUE ("token");
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "VerificationToken_token_idx" ON "VerificationToken"("token");
CREATE INDEX IF NOT EXISTS "VerificationToken_userId_idx" ON "VerificationToken"("userId");

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'VerificationToken_userId_fkey'
    ) THEN
        ALTER TABLE "VerificationToken"
        ADD CONSTRAINT "VerificationToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

**Проверка после выполнения:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'VerificationToken'
ORDER BY ordinal_position;
```

Должны увидеть все колонки включая `type`.

### 2. Проверить переменные окружения в Vercel

Убедитесь, что в Vercel → Settings → Environment Variables настроены:

**Обязательные:**
- ✅ `DATABASE_URL` (Supabase connection string)
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` (https://your-app.vercel.app)
- ✅ `APP_URL` (то же что NEXTAUTH_URL)

**Для email (SMTP):**
- ✅ `SMTP_HOST` (smtp.mail.ru)
- ✅ `SMTP_PORT` (587)
- ✅ `SMTP_USER` (trakerproject@mail.ru)
- ✅ `SMTP_PASSWORD` (секретный)
- ✅ `EMAIL_FROM` ("Project Tracker <trakerproject@mail.ru>")

### 3. После деплоя - протестировать

1. **Новая регистрация:**
   - Зарегистрируйте нового пользователя
   - Проверьте почту (+ папку Спам)
   - Перейдите по ссылке
   - Войдите

2. **Повторная отправка:**
   - Попробуйте войти с неподтверждённым email
   - Нажмите "Отправить письмо повторно"
   - Проверьте почту

3. **Проверка логов Vercel:**
   - Ищите ошибки отправки email
   - Проверьте, что нет ошибок "[REGISTER] Error:"

## 🎯 Что исправлено

✅ **Транзакция** - пользователь и токен создаются атомарно
✅ **Email после транзакции** - отправка не блокирует транзакцию
✅ **Повторная отправка** - API `/api/auth/resend-verification`
✅ **Rate limiting** - 1 запрос в минуту
✅ **Безопасность** - технические ошибки не уходят клиенту
✅ **Production** - `verifyUrl` не показывается в production
✅ **Проверка email** - включена в auth (можно отключить при необходимости)
✅ **UI для повторной отправки** - на странице логина

## 📚 Документация

- **FIXES_SUMMARY.md** - полное описание всех исправлений
- **MIGRATION_GUIDE.md** - руководство по миграции
- **apply-migration.js** - скрипт для просмотра SQL миграции

## 🔍 Мониторинг

После деплоя проверяйте в Vercel → Logs:

```
[REGISTER] Error:          ← ошибки регистрации
[AUTH] Failed to send:     ← ошибки SMTP
[RESEND] Error:           ← ошибки повторной отправки
```

## ⚠️ Если письма не приходят

1. Проверьте переменные SMTP в Vercel
2. Проверьте логи на ошибки SMTP
3. Попробуйте отправить тестовое письмо вручную
4. Рассмотрите альтернативы (SendGrid, Resend, Mailgun)

---

**Главное:** После применения миграции в Supabase всё заработает!
