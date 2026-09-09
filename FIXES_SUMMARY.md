# Исправления регистрации и подтверждения email

## Выполненные исправления

### ✅ 1. Миграция базы данных
Создана миграция `20260909_add_verification_token_type` для добавления недостающей колонки `type` в таблицу `VerificationToken`.

**Файл:** `prisma/migrations/20260909_add_verification_token_type/migration.sql`

Миграция безопасна и:
- Создает таблицу `VerificationToken`, если её нет
- Добавляет колонку `type` с значением по умолчанию `'EMAIL_VERIFY'`
- Добавляет индексы для производительности
- Добавляет foreign key constraint на `User`

### ✅ 2. Транзакция при регистрации
**Файл:** `src/app/api/auth/register/route.ts`

Изменения:
- Создание пользователя и токена теперь выполняется в одной транзакции
- Отправка email происходит ПОСЛЕ успешного завершения транзакции
- Если отправка email не удалась, пользователь всё равно создан и может запросить повторную отправку

### ✅ 3. API для повторной отправки подтверждения
**Файл:** `src/app/api/auth/resend-verification/route.ts`

Функции:
- Отправка нового письма с подтверждением
- Rate limiting (1 запрос в минуту)
- Безопасные ответы без раскрытия существования email
- Автоматическое погашение старых токенов

### ✅ 4. Улучшенная обработка ошибок
**Файл:** `src/app/api/auth/register/route.ts`

- Технические детали (Prisma errors) не возвращаются клиенту
- Понятные сообщения об ошибках для пользователя
- Детальное логирование для отладки на сервере

### ✅ 5. Безопасность production
**Файл:** `src/app/(public)/register/page.tsx`

- `verifyUrl` возвращается только в development режиме
- В production ссылка подтверждения отправляется только по email
- Предотвращение обхода проверки владения почтой

### ✅ 6. Включена проверка emailVerified
**Файл:** `src/lib/auth-options.ts`

- Раскомментирована проверка подтверждённого email при входе
- Пользователи с неподтверждённым email не могут войти
- Сообщение с инструкцией для повторной отправки

### ✅ 7. UI для повторной отправки
**Файл:** `src/app/(public)/login/page.tsx`

- При ошибке "Подтвердите email" показывается кнопка повторной отправки
- Feedback о статусе отправки письма
- Rate limiting на фронтенде

## Инструкция по применению

### Шаг 1: Применить миграцию к production БД

Выполните SQL из файла `prisma/migrations/20260909_add_verification_token_type/migration.sql` в Supabase Dashboard:

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Создайте новый запрос
4. Скопируйте содержимое файла миграции (или запустите `node apply-migration.js` для просмотра)
5. Вставьте и выполните SQL
6. Проверьте результат:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'VerificationToken'
   ORDER BY ordinal_position;
   ```

### Шаг 2: Проверить переменные окружения в Vercel

Убедитесь, что настроены все необходимые переменные:

**Обязательные:**
- ✅ `DATABASE_URL` - connection string к Supabase
- ✅ `NEXTAUTH_SECRET` - секретный ключ для NextAuth
- ✅ `NEXTAUTH_URL` - URL вашего приложения (https://your-app.vercel.app)
- ✅ `APP_URL` - тот же URL, что и NEXTAUTH_URL

**Для отправки email:**
- ✅ `SMTP_HOST` - хост SMTP сервера
- ✅ `SMTP_PORT` - порт SMTP (обычно 587)
- ✅ `SMTP_USER` - логин SMTP
- ✅ `SMTP_PASSWORD` - пароль SMTP (секретный)
- ✅ `EMAIL_FROM` - адрес отправителя с именем

### Шаг 3: Задеплоить изменения

```bash
git add .
git commit -m "Fix: email verification with transaction, resend, and proper error handling

- Add migration for VerificationToken.type column
- Create user and token in single transaction
- Add resend verification API endpoint
- Improve error handling (no technical details to client)
- Hide verifyUrl in production
- Enable emailVerified check in auth
- Add resend UI in login page
- Add rate limiting for resend requests"

git push
```

Vercel автоматически задеплоит изменения.

### Шаг 4: Протестировать

#### Тест 1: Новая регистрация
1. Зарегистрируйте нового пользователя
2. Проверьте логи Vercel на наличие ошибок
3. Проверьте почту (включая папку Спам)
4. Перейдите по ссылке из письма
5. Войдите с подтверждённым email

#### Тест 2: Повторная отправка
1. Попробуйте войти с неподтверждённым email
2. Должна появиться кнопка "Отправить письмо повторно"
3. Нажмите кнопку
4. Проверьте почту
5. Подтвердите email и войдите

#### Тест 3: Rate limiting
1. Запросите повторную отправку
2. Сразу запросите ещё раз
3. Должно появиться сообщение "Слишком частые запросы"

#### Тест 4: Проверка безопасности
1. В production не должен возвращаться `verifyUrl` в API ответе
2. На странице регистрации не должна показываться ссылка подтверждения
3. При ошибке БД клиент должен получить общее сообщение, а не детали Prisma

### Шаг 5: Мониторинг

После деплоя проверяйте логи Vercel на:
- `[REGISTER] Error:` - ошибки регистрации
- `[AUTH] Failed to send verification email:` - ошибки SMTP
- `[RESEND] Error:` - ошибки повторной отправки

## Восстановление незавершённых регистраций

Для пользователей, созданных во время сбоя (до применения миграции):

1. Они останутся в БД с `emailVerified = false`
2. При попытке входа увидят: "Подтвердите email перед входом"
3. Смогут использовать кнопку "Отправить письмо повторно"
4. После подтверждения смогут войти

## Проверка SMTP

Если письма не приходят, проверьте:

1. **Настройки SMTP в Vercel:** все переменные заданы правильно
2. **Логи:** ищите ошибки SMTP в логах Vercel
3. **SMTP сервер:** попробуйте отправить тестовое письмо локально:

```javascript
// test-smtp.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: 'your-test-email@example.com',
  subject: 'Test',
  text: 'Test email',
});
```

4. **Альтернативы:** рассмотрите использование:
   - SendGrid (бесплатно 100 писем/день)
   - Resend (бесплатно 3000 писем/месяц)
   - Mailgun (бесплатно 5000 писем/месяц первые 3 месяца)

## Откат (если потребуется)

Миграция безопасна и не требует отката. Если нужно отключить проверку email:

1. В `src/lib/auth-options.ts` закомментируйте строки 36-38
2. Задеплойте изменения

Колонка `type` останется в БД и не помешает работе.
