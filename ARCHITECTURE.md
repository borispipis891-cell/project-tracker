# Project Tracker — Архитектура

## 1. Стек технологий

| Слой | Технология | Причина |
|---|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript | SSR/SSG, файловая маршрутизация, единый стек с backend |
| Стили/UI | Tailwind CSS + shadcn/ui | компактные корпоративные компоненты, легко кастомизировать |
| Backend | Next.js Route Handlers (API), TypeScript | не нужен отдельный сервер, единый деплой |
| БД | PostgreSQL | реляционная целостность, нужна для project_members/task_assignees/custom columns |
| ORM | Prisma | типобезопасность, миграции, удобный seed |
| Аутентификация | Auth.js (NextAuth) Credentials Provider + собственные таблицы users/sessions | email+пароль, "запомнить меня", контроль над hashing |
| Email | Nodemailer + SMTP (настраивается через .env) | не завязано на конкретного провайдера |
| Cron/Worker | Node cron-задача (node-cron), отдельный процесс `worker/` | проверка дедлайнов независимо от посещений сайта |
| Таблица | TanStack Table (headless) + dnd-kit | virtualization, resize, reorder, inline-editing без переизобретения |
| State | React Query (TanStack Query) | кэш, оптимистичные обновления при inline-editing |

Всё разворачивается как обычный Node.js процесс (сайт) + отдельный worker-процесс (cron). Подходит для VPS, Docker или любого Node-хостинга — без привязки к конкретному облаку.

## 2. Структура базы данных (Prisma models, сокращённо)

```
User            id, name, email(unique), passwordHash, role[USER|ADMIN],
                emailVerified, avatarUrl, isBlocked, createdAt

Session         id, userId, expiresAt, sessionToken

VerificationToken   id, userId, token, type[EMAIL_VERIFY|PASSWORD_RESET], expiresAt

Project         id, name, receivedAt, deadline, customer, contractNo, regNo,
                stage, status[NEW|IN_PROGRESS|DONE|BLOCKED|WAITING],
                priority[CRITICAL|HIGH|MEDIUM|LOW],
                progress (0-100, manualOverride: boolean),
                description, ownerId, isDeleted (soft delete), createdAt, updatedAt

ProjectMember   id, projectId, userId, roleInProject (responsible/observer)

Task            id, projectId, title, status[NOT_STARTED|IN_PROGRESS|BLOCKED|REVIEW|DONE],
                priority, startDate, deadline, progress, comment,
                order (для drag&drop), isDeleted, createdAt, updatedAt

TaskAssignee    id, taskId, userId

CustomColumn    id, name, type[TEXT|NUMBER|DATE|DATETIME|SELECT|CHECKBOX|USER|LINK],
                options (json, для SELECT), scope[PROJECT|TASK], width, order, hidden

CustomFieldValue  id, columnId, entityId (projectId или taskId), value(json)

Notification    id, userId, type, message, entityType, entityId, isRead, createdAt

Comment         id, entityType[PROJECT|TASK], entityId, authorId, text, createdAt

ActivityLog     id, entityType, entityId, userId, field, oldValue, newValue, createdAt

UserSettings    id, userId, tableConfig(json: порядок/ширина/видимость столбцов, раскрытые проекты, фильтры, сортировка),
                notifyEmail(json: {7d,3d,1d,dueDay,overdue} отдельно для project/task),
                notifyInApp(bool)
```

Индексы: `Project.deadline`, `Project.status`, `Task.projectId`, `Notification.userId+isRead` — под фильтры/уведомления при 1000+ проектов.

## 3. API (Route Handlers)

```
POST   /api/auth/register
POST   /api/auth/verify-email
POST   /api/auth/login            (через NextAuth callback)
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/logout

GET    /api/projects              ?filter=...&sort=...&page=...
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id          (в т.ч. точечные inline-обновления одного поля)
DELETE /api/projects/:id          (soft delete)

GET    /api/projects/:id/tasks
POST   /api/projects/:id/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/reorder         (drag&drop, batch order update)

GET    /api/columns
POST   /api/columns
PATCH  /api/columns/:id
DELETE /api/columns/:id

GET    /api/notifications
PATCH  /api/notifications/:id/read

GET    /api/comments?entityType=&entityId=
POST   /api/comments

GET    /api/activity?entityType=&entityId=

GET    /api/users                 (для выбора ответственного, ADMIN — управление)
POST   /api/admin/users
PATCH  /api/admin/users/:id       (блокировка, роль)

GET    /api/dashboard/summary
GET    /api/calendar/events
```

Права доступа проверяются в каждом хендлере: обычный USER получает только проекты, где он в `ProjectMember` или назначен на задачу; ADMIN — все.

## 4. Страницы (App Router)

```
/login
/register
/verify-email
/forgot-password
/reset-password
/dashboard            — сводка, ближайшие дедлайны, мои задачи
/projects             — главная таблица (основной экран)
/projects/[id]        — карточка проекта: детали, задачи, комментарии, история
/calendar             — месяц/неделя/день
/settings             — профиль/безопасность/уведомления/таблица
/admin                — пользователи, проекты, управление столбцами (только ADMIN)
```

## 5. Ключевые компоненты frontend

- `ProjectsTable` — обёртка над TanStack Table: resize, reorder columns (dnd-kit), virtualized rows, expandable rows (задачи), inline-editing cells.
- `EditableCell` — универсальная ячейка: date-picker / select / user-picker / number / checkbox / text, в зависимости от типа столбца.
- `QuickFilters`, `FilterPanel`, `GlobalSearch` — управляют общим query-состоянием (хранится в URL + `UserSettings.tableConfig`).
- `TaskList` внутри раскрытой строки проекта, с drag&drop сортировкой.
- `NotificationBell`, `CommentsThread`, `ActivityTimeline`.
- `ColumnManagerDialog` — создание/редактирование пользовательских столбцов.

## 6. Поток авторизации

1. Регистрация → создаётся User(emailVerified=false) + VerificationToken → письмо со ссылкой.
2. Переход по ссылке → emailVerified=true.
3. Вход только при emailVerified=true (иначе — предложение выслать письмо повторно).
4. Сессии — JWT или DB-сессии через NextAuth, cookie httpOnly+secure.
5. Восстановление пароля — токен с TTL (например 1 час), одноразовый.

## 7. Email и уведомления (cron/worker)

Отдельный процесс `worker/index.ts`, запускается через `node-cron` (или системный cron, вызывающий `npm run check-deadlines`):

- Раз в день (например в 08:00 по серверному времени): проходит по всем активным Project и Task, сравнивает `deadline` с настройками `UserSettings.notifyEmail` (7д/3д/1д/день дедлайна/просрочка), создаёт `Notification` и отправляет email через Nodemailer, если ещё не отправлялось за этот триггер (защита от дублей — таблица логов отправок или флаг на Notification).
- Дополнительно — событийные письма (не по расписанию, а сразу): назначение проекта/задачи, изменение статуса — отправляются прямо из соответствующего API-хендлера.

Шаблоны в `/lib/email/templates`: welcome, verify-email, password-reset, deadline-warning, deadline-overdue, task-assigned, project-assigned.

## 8. Порядок реализации (этапы)

1. **База**: Prisma schema + миграции + seed, NextAuth (регистрация/вход/подтверждение email/восстановление пароля).
2. **Core CRUD**: проекты + задачи (API + минимальная таблица без изысков), права доступа.
3. **Таблица уровня Excel**: inline-editing, раскрытие задач, drag&drop, resize/reorder/hide столбцов, сохранение UserSettings.
4. **Пользовательские столбцы**: CustomColumn + CustomFieldValue, UI создания/редактирования.
5. **Фильтры, поиск, сортировка** (серверные, с пагинацией).
6. **Уведомления + email + cron-worker**.
7. **Комментарии, история изменений**.
8. **Dashboard, Calendar, страница проекта, Settings, Admin**.
9. **Финальный прогон сценариев из ТЗ, исправление багов, README/.env.example**.

---

Скажите, начинать ли с этапа 1 (Prisma-схема + auth), или хотите сначала что-то поправить в архитектуре выше.
